/**
 * 笔趣阁小说下载器 —— Web 服务端
 *   启动： node server.js [port]
 *   默认端口 5173，浏览器访问 http://localhost:5173
 *
 * 路由：
 *   GET  /                       首页
 *   GET  /api/search?q=           搜索
 *   GET  /api/book/:id           书籍详情
 *   POST /api/download {id,...}  开始下载 -> {taskId}
 *   GET  /api/progress/:taskId   SSE 实时进度
 *   GET  /api/downloads          任务列表
 *   GET  /api/file/:taskId       下载产物 txt
 *   POST /api/cancel/:taskId     取消
 *   POST /api/refresh-js         刷新站点 JS
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const core = require('./lib/core');
const { searchBooks, getBookInfo, getBookList, getChapter, coverUrl, apiUrl, fetchChaptersViaBrowser, refreshJS, formatChapter, safeName, sleep, SITE } = core;
const bq5 = require('./lib/bq5');

const PORT = Number(process.argv[2]) || 5173;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// ---------------------- 下载任务管理器 ----------------------

class DownloadTask {
  constructor(id, opts = {}) {
    this.taskId = 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.bookId = String(id);
    this.concurrency = Math.max(1, Math.min(16, opts.concurrency || 6));
    this.range = opts.range || null;
    this.status = 'pending';
    this.title = '';
    this.author = '';
    this.total = 0;
    this.to = 0;          // 实际下载目标终点（含 range 截断）
    this.done = 0;
    this.failed = [];
    this.error = '';
    this.filePath = '';
    this.startTime = 0;
    this.cancelled = false;
    this.listeners = new Set(); // SSE 响应对象
    this.promise = null;
  }

  snapshot() {
    const elapsed = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const target = this.to || this.total;
    const speed = (this.done && elapsed) ? (this.done / elapsed) : 0;
    const remain = Math.max(0, target - this.done);
    const eta = speed > 0 ? Math.ceil(remain / speed) : 0;
    return {
      taskId: this.taskId,
      bookId: this.bookId,
      title: this.title,
      author: this.author,
      total: this.total,
      to: target,
      done: this.done,
      failed: this.failed.slice(0, 20),
      failedCount: this.failed.length,
      status: this.status,
      error: this.error,
      elapsed: Math.round(elapsed),
      speed: +speed.toFixed(1),
      eta,
      pct: target ? +((this.done / target) * 100).toFixed(1) : 0,
      filePath: this.filePath,
      fileName: this.filePath ? path.basename(this.filePath) : '',
    };
  }

  emit() {
    const payload = `data: ${JSON.stringify(this.snapshot())}\n\n`;
    for (const l of this.listeners) { try { l.write(payload); } catch {} }
  }

  start() {
    this.promise = this.run();
    return this.taskId;
  }

  async run() {
    try {
      this.status = 'running';
      const info = await getBookInfo(this.bookId);
      this.title = info.title;
      this.author = info.author;
      this.total = Number(info.lastchapterid) || 0;
      if (!this.total) throw new Error('无法获取总章节数');
      this.startTime = Date.now();
      this.emit();

      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      const fileName = `${safeName(this.title)}.txt`;
      const filePath = path.join(DOWNLOAD_DIR, fileName);
      const progFile = path.join(DOWNLOAD_DIR, `.${safeName(this.title)}_${this.bookId}.progress.json`);
      this.filePath = filePath;

      // 断点续传
      let startNo = 1;
      if (fs.existsSync(progFile)) {
        try {
          const p = JSON.parse(fs.readFileSync(progFile, 'utf8'));
          if (p.total === this.total && p.done >= 1) startNo = p.done + 1;
        } catch {}
      }
      let to = this.total;
      if (this.range) { startNo = Math.max(startNo, this.range[0]); to = Math.min(this.total, this.range[1]); }
      this.to = to;

      const header =
        `${info.title}\n作者：${info.author}\n状态：${info.full}  共 ${this.total} 章\n` +
        `来源：${SITE}#/book/${this.bookId}/\n下载时间：${new Date().toLocaleString('zh-CN')}\n` +
        `\n${'='.repeat(48)}\n`;

      // 有序写入器（实例内嵌）
      const stream = fs.createWriteStream(filePath, { flags: startNo === 1 ? 'w' : 'a' });
      if (startNo === 1) stream.write(header);
      let next = startNo, done = startNo - 1;
      const buffer = new Map();
      const flush = async () => {
        while (buffer.has(next)) {
          const c = buffer.get(next); buffer.delete(next);
          await new Promise(r => stream.write(c, r));
          done = next++;
          this.done = done;
          this.emit();
        }
      };

      let cursor = startNo;
      const batchSize = Math.max(8, this.concurrency * 2); // 每批抓取的章节数
      let firstBatch = true;
      while (cursor <= to && !this.cancelled) {
        const batch = [];
        const end = Math.min(to, cursor + batchSize - 1);
        for (let cid = cursor; cid <= end; cid++) batch.push(cid);
        cursor = end + 1;

        // 用真实浏览器环境抓取，避免 apibi 对非浏览器请求返回污染数据
        const urls = batch.map(cid => apiUrl('chapter', { id: Number(this.bookId), chapterid: cid }));
        let results = null;
        try {
          results = await fetchChaptersViaBrowser(urls);
        } catch (e) {
          const msg = String(e.message || e);
          if (firstBatch) throw e; // 浏览器不可用/启动失败：直接终止，避免批量记失败
          for (const cid of batch) {
            this.failed.push({ chapterid: cid, err: msg });
            buffer.set(cid, `\n第${cid}章（下载失败：${msg}）\n\n[本章获取失败]\n`);
          }
          await flush();
          await sleep(200);
          continue;
        } finally {
          firstBatch = false;
        }

        for (let i = 0; i < batch.length; i++) {
          const cid = batch[i];
          const ch = results && results[i];
          if (!ch || ch.error) {
            const msg = ch && ch.error ? ch.error : '无返回';
            this.failed.push({ chapterid: cid, err: msg });
            buffer.set(cid, `\n第${cid}章（下载失败：${msg}）\n\n[本章获取失败]\n`);
          } else {
            buffer.set(cid, formatChapter(ch.chaptername || `第${cid}章`, ch.txt));
          }
        }
        await flush();
        if (cursor - 1 === to || cursor % 20 === 0) {
          try { fs.writeFileSync(progFile, JSON.stringify({ total: to, done })); } catch {}
        }
        await sleep(80);
      }

      await new Promise(r => stream.end(r));

      if (this.cancelled) {
        this.status = 'cancelled';
      } else if (this.failed.length === 0 && done === to) {
        this.status = 'done';
        try { fs.unlinkSync(progFile); } catch {}
      } else {
        this.status = 'done'; // 有失败章节也视为完成，提示用户
      }
      this.emit();
    } catch (e) {
      this.status = 'error';
      this.error = e.message;
      this.emit();
    }
  }

  cancel() { this.cancelled = true; }
}

// 备用源（biquge5.com）下载任务：用于主站数据损坏的书籍（如《兽血沸腾》）
class BQ5DownloadTask extends DownloadTask {
  constructor(url, opts = {}) {
    super(url, opts);
    this.url = String(url);
    this.missing = [];     // 源站缺失的章节编号
    this.missingCount = 0;
  }
  snapshot() {
    const s = super.snapshot();
    s.missing = this.missing;
    s.missingCount = this.missingCount;
    return s;
  }
  async run() {
    try {
      this.status = 'running';
      const book = await bq5.getBook(this.url);
      this.title = book.title;
      this.author = book.author;
      const { plan, missing } = bq5.buildDownloadPlan(book.chapters);
      this.missing = missing;
      this.missingCount = missing.length;
      this.total = plan.length;
      this.to = plan.length;
      if (!this.total) throw new Error('未找到可下载章节，书籍页解析失败：' + this.url);
      this.startTime = Date.now();
      this.emit();

      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      const fileName = `${safeName(this.title)}.txt`;
      const filePath = path.join(DOWNLOAD_DIR, fileName);
      this.filePath = filePath;

      const header =
        `${this.title}\n作者：${this.author}\n共 ${this.total} 章（源站缺失：${missing.join('、') || '无'}）\n` +
        `来源：https://www.biquge5.com/\n下载时间：${new Date().toLocaleString('zh-CN')}\n` +
        `\n${'='.repeat(48)}\n`;
      const stream = fs.createWriteStream(filePath, { flags: 'w' });
      stream.write(header);

      // 有序写入：按计划顺序落盘（计划已按编号升序）
      let next = 0;
      const buffer = new Map();
      const flush = async () => {
        while (buffer.has(next)) {
          const c = buffer.get(next); buffer.delete(next);
          await new Promise(r => stream.write(c, r));
          this.done = next + 1;
          next++;
          this.emit();
        }
      };

      let cursor = 0;
      const batchSize = Math.max(4, this.concurrency * 2);
      while (cursor < this.total && !this.cancelled) {
        const startIdx = cursor;
        const batch = plan.slice(startIdx, startIdx + batchSize);
        cursor += batch.length;
        const results = await bq5.fetchPlan(batch);
        results.forEach((r, i) => {
          const p = batch[i];
          if (r.error) {
            this.failed.push({ num: p.num, err: r.error });
            buffer.set(startIdx + i, `\n第${p.num}章（下载失败：${r.error}）\n\n[本章获取失败]\n`);
          } else {
            buffer.set(startIdx + i, formatChapter(r.title || `第${p.num}章`, r.txt));
          }
        });
        await flush();
      }
      await new Promise(r => stream.end(r));
      this.status = this.cancelled ? 'cancelled' : 'done';
      this.emit();
    } catch (e) {
      this.status = 'error';
      this.error = e.message;
      this.emit();
    }
  }
}

const tasks = new Map(); // taskId -> DownloadTask / BQ5DownloadTask

// 通用缓存（阅读用，避免重复抓取；上限 cap 条，先进先出）
function makeCache(cap) {
  const cache = new Map();
  const pending = new Map(); // key -> Promise，避免同一 key 并发重复抓取
  return async function getCached(key, loader) {
    if (cache.has(key)) return cache.get(key);
    if (pending.has(key)) return pending.get(key);
    const p = loader().then(data => {
      if (cache.size >= cap) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
      }
      cache.set(key, data);
      return data;
    }).finally(() => pending.delete(key));
    pending.set(key, p);
    return p;
  };
}

// 章节内容缓存（上限 300 条）
const getChapterCached = makeCache(300);
// 书籍详情缓存（上限 50 本，命中后秒开详情页）
const getBookCached = makeCache(50);

function startDownload(id, opts) {
  // 清理已结束任务，避免列表堆积
  for (const [tid, t] of tasks) {
    if (['done', 'cancelled', 'error'].includes(t.status)) tasks.delete(tid);
  }
  // 同一本书已有活跃任务时复用，不重复下载
  for (const t of tasks.values()) {
    if (t.bookId === String(id) && (t.status === 'running' || t.status === 'pending')) {
      return t.taskId;
    }
  }
  const t = new DownloadTask(id, opts);
  tasks.set(t.taskId, t);
  t.start();
  return t.taskId;
}

function startBq5Download(url, opts) {
  // 清理已结束任务，避免列表堆积
  for (const [tid, t] of tasks) {
    if (['done', 'cancelled', 'error'].includes(t.status)) tasks.delete(tid);
  }
  // 同一本书已有活跃任务时复用
  for (const t of tasks.values()) {
    if (t instanceof BQ5DownloadTask && t.bookId === String(url) && (t.status === 'running' || t.status === 'pending')) {
      return t.taskId;
    }
  }
  const t = new BQ5DownloadTask(url, opts);
  tasks.set(t.taskId, t);
  t.start();
  return t.taskId;
}

// ---------------------- HTTP 路由 ----------------------

function send(res, code, body, headers = {}) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', ...headers };
  res.writeHead(code, h);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function serveStatic(req, res, pathname) {
  let p = decodeURIComponent(pathname);
  if (p === '/' || p === '') p = '/index.html';
  const fp = path.join(PUBLIC_DIR, p);
  if (!fp.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(fp, (err, data) => {
    if (err) return send(res, 404, { error: 'not found' });
    // HTML 文件禁用缓存，避免更新后浏览器仍用旧版本
    const headers = { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' };
    if (path.extname(fp) === '.html') headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    res.writeHead(200, headers);
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const p = u.pathname;
  const q = u.searchParams;

  // CORS（便于本地调试）
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // ---- API ----
    if (p === '/api/search' && req.method === 'GET') {
      const kw = q.get('q') || '';
      if (!kw) return send(res, 400, { error: '缺少关键词 q' });
      const data = await searchBooks(kw);
      return send(res, 200, { data });
    }

    if (p === '/api/search/bq5' && req.method === 'GET') {
      const kw = q.get('q') || '';
      if (!kw) return send(res, 400, { error: '缺少关键词 q' });
      const data = await bq5.searchBooks(kw);
      return send(res, 200, { data });
    }

    // ---- 在线阅读（biquge5 源） ----

    // 书籍详情（含阅读目录）：GET /api/book/bq5?url=...
    //   ?stage=info  只返回书籍信息（快，用于详情页立即出画面）
    //   ?stage=full  返回完整目录（默认）
    if (p === '/api/book/bq5' && req.method === 'GET') {
      const url = q.get('url') || '';
      if (!url) return send(res, 400, { error: '缺少书籍链接 url' });
      const stage = q.get('stage') || 'full';
      if (stage === 'info') {
        const info = await getBookCached('bq5info:' + url, async () => {
          const book = await bq5.getBookInfoOnly(url);
          return book;
        });
        return send(res, 200, info);
      }
      const data = await getBookCached('bq5book:' + url, async () => {
        const book = await bq5.getBook(url);
        const reading = bq5.buildReadingList(book.chapters);
        const missing = bq5.missingChapters(book.chapters);
        return { ...book, reading, missing };
      });
      return send(res, 200, data);
    }

    // 章节内容（含缓存与并发去重）：GET /api/chapter/bq5?url=...[, ...]
    if (p === '/api/chapter/bq5' && req.method === 'GET') {
      const urls = (q.get('url') || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!urls.length) return send(res, 400, { error: '缺少章节链接 url' });
      const key = 'bq5:' + urls.join(',');
      const data = await getChapterCached(key, () => bq5.fetchChapter(urls));
      return send(res, 200, data);
    }

    const m1 = p.match(/^\/api\/book\/(\d+)$/);
    if (m1 && req.method === 'GET') {
      const info = await getBookInfo(m1[1]);
      return send(res, 200, info);
    }

    // 主源阅读目录：GET /api/catalog/:id  → { reading: [{num,title,chapterid}], ...info }
    const mc = p.match(/^\/api\/catalog\/(\d+)$/);
    if (mc && req.method === 'GET') {
      const id = mc[1];
      const data = await getBookCached('catalog:' + id, async () => {
        const info = await getBookInfo(id);
        const titles = await getBookList(id);
        const total = Number(info.lastchapterid) || titles.length;
        const reading = [];
        for (let cid = 1; cid <= total; cid++) {
          const title = titles[cid - 1];
          if (!title) continue;   // 主源缺该章
          reading.push({ num: cid, title, chapterid: cid });
        }
        return {
          id: String(id), title: info.title, author: info.author,
          status: info.full || '', intro: info.intro || '',
          cover: coverUrl(id), lastUpdate: info.lastupdate || '',
          total, reading, source: 'bqg713',
        };
      });
      return send(res, 200, data);
    }

    // 主源章节正文（浏览器环境抓取，避免 apibi 污染）：GET /api/chapter/:id/:chapterid
    const mch = p.match(/^\/api\/chapter\/(\d+)\/(\d+)$/);
    if (mch && req.method === 'GET') {
      const id = Number(mch[1]), cid = Number(mch[2]);
      const data = await getChapterCached('main:' + id + ':' + cid, async () => {
        const url = apiUrl('chapter', { id, chapterid: cid });
        const [ch] = await fetchChaptersViaBrowser([url]);
        if (!ch || ch.error) throw new Error((ch && ch.error) || '获取章节失败');
        return { title: ch.chaptername || '', txt: ch.txt || '' };
      });
      return send(res, 200, data);
    }

    if (p === '/api/download' && req.method === 'POST') {
      const body = await readBody(req);
      const id = body.id;
      if (!id) return send(res, 400, { error: '缺少 id' });
      const opts = {};
      if (body.concurrency) opts.concurrency = Number(body.concurrency);
      if (body.range && Array.isArray(body.range)) opts.range = body.range;
      const taskId = startDownload(id, opts);
      return send(res, 200, { taskId });
    }

    if (p === '/api/download/bq5' && req.method === 'POST') {
      const body = await readBody(req);
      const url = body.url;
      if (!url) return send(res, 400, { error: '缺少书籍链接 url' });
      const opts = {};
      if (body.concurrency) opts.concurrency = Number(body.concurrency);
      const taskId = startBq5Download(url, opts);
      return send(res, 200, { taskId });
    }

    if (p === '/api/downloads' && req.method === 'GET') {
      return send(res, 200, { data: [...tasks.values()].map(t => t.snapshot()) });
    }

    const m2 = p.match(/^\/api\/progress\/(.+)$/);
    if (m2 && req.method === 'GET') {
      const t = tasks.get(m2[1]);
      if (!t) return send(res, 404, { error: '任务不存在' });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(`data: ${JSON.stringify(t.snapshot())}\n\n`);
      t.listeners.add(res);
      req.on('close', () => t.listeners.delete(res));
      // 若任务已结束，补发一次后保持连接以便客户端收尾
      return;
    }

    const m3 = p.match(/^\/api\/file\/(.+)$/);
    if (m3 && req.method === 'GET') {
      const t = tasks.get(m3[1]);
      if (!t || !t.filePath || !fs.existsSync(t.filePath))
        return send(res, 404, { error: '文件不存在' });
      const stat = fs.statSync(t.filePath);
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(t.filePath))}`,
        'Content-Length': stat.size,
      });
      fs.createReadStream(t.filePath).pipe(res);
      return;
    }

    const m4 = p.match(/^\/api\/cancel\/(.+)$/);
    if (m4 && (req.method === 'POST' || req.method === 'GET')) {
      const t = tasks.get(m4[1]);
      if (!t) return send(res, 404, { error: '任务不存在' });
      t.cancel();
      return send(res, 200, { ok: true });
    }

    if (p === '/api/refresh-js' && req.method === 'POST') {
      const saved = await refreshJS();
      return send(res, 200, { saved });
    }

    // ---- 静态资源 ----
    if (req.method === 'GET') return serveStatic(req, res, p);
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  笔趣阁小说下载器已启动：  ${url}\n  按 Ctrl+C 停止。\n`);
  // 预热浏览器（启动约 2.6s + 导航站点约 1.3s）：放到后台，避免首次搜索/阅读白等 4s
  core.getBrowserPage()
    .then(() => console.log('  浏览器环境已就绪（抓取无需再等待启动）'))
    .catch(() => console.log('  浏览器预热失败，首次抓取时会重试'));
  // 尝试自动打开浏览器（Windows）
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`, () => {});
  }
});
