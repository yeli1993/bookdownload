#!/usr/bin/env node
/**
 * 笔趣阁(bqg713.cc)小说下载器 —— 命令行版
 *   node downloader.js                      # 交互式菜单
 *   node downloader.js <书籍ID或书籍URL>     # 直接下载
 *   node downloader.js -s <关键词>          # 搜索并选择下载
 *   node downloader.js --refresh-js        # 刷新站点 JS
 * Web 版： node server.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const core = require('./lib/core');
const { searchBooks, getBookInfo, apiUrl, fetchChaptersViaBrowser, refreshJS, formatChapter, safeName, sleep, SITE } = core;

const DEFAULT_OUT = path.join(__dirname, 'downloads');

function progBar(p) {
  const w = 24, f = Math.round(p * w);
  return `[${'='.repeat(f)}${' '.repeat(Math.max(0, w - f))}]`;
}

// 有序写入器：并发抓取，按章节顺序写入文件，支持断点续传
class OrderedWriter {
  constructor(filePath, startNo, total, header) {
    this.filePath = filePath;
    this.total = total;
    this.next = startNo;
    this.done = startNo - 1;
    this.buffer = new Map();
    this.failed = [];
    this.startTime = Date.now();
    this.stream = fs.createWriteStream(filePath, { flags: startNo === 1 ? 'w' : 'a' });
    if (startNo === 1 && header) this.stream.write(header);
  }
  async push(id, content) {
    this.buffer.set(id, content);
    while (this.buffer.has(this.next)) {
      await new Promise(res => this.stream.write(this.buffer.get(this.next), res));
      this.buffer.delete(this.next);
      this.done = this.next++;
      this.print();
    }
  }
  fail(id, err) { this.failed.push({ chapterid: id, err: String(err) }); }
  print() {
    const p = this.done / this.total;
    const pct = (p * 100).toFixed(1).padStart(5);
    const el = ((Date.now() - this.startTime) / 1000).toFixed(0);
    process.stdout.write(`\r${progBar(p)} ${pct}%  [${this.done}/${this.total}]  ${el}s`);
  }
  async close() {
    await new Promise(res => this.stream.end(res));
    process.stdout.write('\n');
  }
}

async function downloadBook(id, opts = {}) {
  const outDir = opts.out || DEFAULT_OUT;
  const concurrency = Math.max(1, Math.min(16, opts.concurrency || 6));
  const range = opts.range;

  const info = await getBookInfo(id);
  const total = Number(info.lastchapterid) || 0;
  if (!total) throw new Error('无法获取总章节数（lastchapterid 为空）');

  console.log('\n——————————————————————————————————————————');
  console.log(`书名：${info.title}`);
  console.log(`作者：${info.author}`);
  console.log(`状态：${info.full}  |  共 ${total} 章  |  更新：${info.lastupdate}`);
  console.log(`最新：${info.lastchapter}`);
  console.log('——————————————————————————————————————————\n');

  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `${safeName(info.title)}.txt`;
  const filePath = path.join(outDir, fileName);
  const progFile = path.join(outDir, `.${safeName(info.title)}_${id}.progress.json`);

  let startNo = 1;
  if (fs.existsSync(progFile)) {
    try {
      const p = JSON.parse(fs.readFileSync(progFile, 'utf8'));
      if (p.total === total && p.done >= 1) {
        startNo = p.done + 1;
        console.log(`检测到进度，从第 ${startNo} 章续传（已完成 ${p.done}/${total}）。\n`);
      }
    } catch {}
  }

  let to = total;
  if (range) { startNo = Math.max(startNo, range[0]); to = Math.min(total, range[1]); }

  const header =
    `${info.title}\n作者：${info.author}\n状态：${info.full}  共 ${total} 章\n` +
    `来源：${SITE}#/book/${id}/\n下载时间：${new Date().toLocaleString('zh-CN')}\n` +
    `\n${'='.repeat(48)}\n`;

  if (startNo > to) { console.log('无需下载，目标范围已完成。'); return filePath; }

  const writer = new OrderedWriter(filePath, startNo, to, header);
  let cursor = startNo;
  const batchSize = Math.max(8, concurrency * 2); // 每批抓取的章节数
  let firstBatch = true;
  while (cursor <= to) {
    const batch = [];
    const end = Math.min(to, cursor + batchSize - 1);
    for (let cid = cursor; cid <= end; cid++) batch.push(cid);
    cursor = end + 1;

    // 用真实浏览器环境抓取，避免 apibi 对非浏览器请求返回污染数据
    const urls = batch.map(cid => apiUrl('chapter', { id: Number(id), chapterid: cid }));
    let results = null;
    try {
      results = await fetchChaptersViaBrowser(urls);
    } catch (e) {
      const msg = String(e.message || e);
      if (firstBatch) throw e; // 浏览器不可用/启动失败：直接终止
      for (const cid of batch) {
        writer.fail(cid, msg);
        await writer.push(cid, `\n第${cid}章（下载失败：${msg}）\n\n[本章获取失败]\n`);
      }
      continue;
    } finally {
      firstBatch = false;
    }

    for (let i = 0; i < batch.length; i++) {
      const cid = batch[i];
      const ch = results && results[i];
      if (!ch || ch.error) {
        const msg = ch && ch.error ? ch.error : '无返回';
        writer.fail(cid, msg);
        await writer.push(cid, `\n第${cid}章（下载失败：${msg}）\n\n[本章获取失败]\n`);
      } else {
        await writer.push(cid, formatChapter(ch.chaptername || `第${cid}章`, ch.txt));
      }
    }
    if (cursor - 1 === to || cursor % 20 === 0)
      fs.writeFileSync(progFile, JSON.stringify({ id: Number(id), title: info.title, total: to, done: writer.done, file: filePath }));
  }

  await writer.close();

  if (writer.failed.length) {
    console.log(`\n完成，但有 ${writer.failed.length} 章失败，可重新运行续传。`);
  } else {
    console.log(`\n下载完成 → ${filePath}`);
  }
  if (writer.done === to && writer.failed.length === 0) { try { fs.unlinkSync(progFile); } catch {} }
  return filePath;
}

// ---------------------- 交互式 CLI ----------------------
function ask(rl, q) { return new Promise(res => rl.question(q, a => res(a.trim()))); }
function parseBookId(input) {
  if (!input) return null;
  if (/^\d+$/.test(input)) return input;
  const m = input.match(/book\/(\d+)/i);
  return m ? m[1] : null;
}
async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('=== 笔趣阁小说下载器 ===');
  console.log('1. 搜索小说并下载');
  console.log('2. 输入书籍ID / 链接直接下载');
  console.log('3. 启动 Web 界面 (node server.js)');
  console.log('4. 退出\n');
  const choice = await ask(rl, '请选择 [1/2/3/4]: ');
  if (choice === '1') {
    const kw = await ask(rl, '输入关键词（书名/作者）: ');
    if (!kw) { rl.close(); return; }
    const list = await searchBooks(kw);
    if (!list.length) { console.log('未找到结果。'); rl.close(); return interactive(); }
    list.slice(0, 20).forEach((b, i) => console.log(`${String(i+1).padStart(2)}. [${b.id}] ${b.title}  —  ${b.author}`));
    const pick = await ask(rl, '\n选择序号下载（回车取消）: ');
    const idx = Number(pick) - 1;
    rl.close();
    if (idx >= 0 && idx < list.length) await downloadBook(list[idx].id, { out: DEFAULT_OUT });
  } else if (choice === '2') {
    const input = await ask(rl, '书籍ID 或 链接: ');
    rl.close();
    const id = parseBookId(input);
    if (!id) { console.log('无法识别书籍ID。'); return; }
    await downloadBook(id, { out: DEFAULT_OUT });
  } else if (choice === '3') {
    rl.close(); require('child_process').spawn(process.execPath, ['server.js'], { cwd: __dirname, stdio: 'inherit', shell: true });
  } else { rl.close(); }
}
function parseOpts(args) {
  const o = {};
  const c = args.indexOf('--concurrency'); if (c !== -1) o.concurrency = Number(args[c+1]);
  const u = args.indexOf('--out'); if (u !== -1) o.out = args[u+1];
  const r = args.indexOf('--range'); if (r !== -1) { const [a,b] = String(args[r+1]).split('-').map(Number); if (a&&b) o.range = [a,b]; }
  return o;
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--refresh-js')) return refreshJS().then(() => console.log('刷新完成。'));
  let si = args.indexOf('-s'); if (si === -1) si = args.indexOf('--search');
  if (si !== -1) {
    const kw = args[si+1]; if (!kw) { console.log('请提供搜索关键词。'); return; }
    const list = await searchBooks(kw);
    if (!list.length) { console.log('未找到结果。'); return; }
    list.slice(0, 20).forEach((b, i) => console.log(`${String(i+1).padStart(2)}. [${b.id}] ${b.title}  —  ${b.author}`));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const pick = await ask(rl, '\n选择序号下载（回车取消）: '); rl.close();
    const idx = Number(pick) - 1;
    if (idx >= 0 && idx < list.length) await downloadBook(list[idx].id, parseOpts(args));
    return;
  }
  const first = args.find(a => !a.startsWith('-'));
  if (first) { const id = parseBookId(first); if (!id) { console.log('无法识别书籍ID或链接。'); return; } await downloadBook(id, parseOpts(args)); return; }
  await interactive();
}
main().catch(e => { console.error('\n出错：', e.message); process.exit(1); });
