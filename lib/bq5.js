/**
 * biquge5.com 备用源
 *   - 书籍页 https://www.biquge5.com/{cat}_{book}/   目录分页 index_1.html...
 *   - 章节页 /{cat}_{book}/{id}.html                 正文在 .font_max / .showtxt，分页为 {id}_2.html...
 * 排序：主站 bqg713 部分书籍数据损坏（如《兽血沸腾》第60章起被替换），本模块提供干净源。
 */
'use strict';

const core = require('./core');

const BQ5_SITE = 'https://www.biquge5.com';

// ---------------------- 章节编号解析（中文数字） ----------------------

const CN_DIGIT = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };

// 中文数字 -> 阿拉伯数字，支持 "十""百" 层级与纯数字拼接（"四七三" -> 473，"一百零五" -> 105）
function cnToNum(str) {
  if (!str) return 0;
  if (!/[十百]/.test(str)) {
    let n = 0;
    for (const ch of str) if (CN_DIGIT[ch] !== undefined) n = n * 10 + CN_DIGIT[ch];
    return n;
  }
  let total = 0, num = 0;
  for (const ch of str) {
    if (CN_DIGIT[ch] !== undefined) num = CN_DIGIT[ch];
    else if (ch === '十') { total += (num || 1) * 10; num = 0; }
    else if (ch === '百') { total += (num || 1) * 100; num = 0; }
  }
  return total + num;
}

// 从章节标题解析编号："第524章" -> 524、"第七百章 万古绝唱之战" -> 700、"第四七三章" -> 473；无编号返回 0
function parseChNum(title) {
  const am = (title || '').match(/第(\d+)章/);
  if (am) return Number(am[1]);
  const cm = (title || '').match(/第([零一二三四五六七八九十百]+)章/);
  return cm ? cnToNum(cm[1]) : 0;
}

// 字母编号（第A章/第II章/第章）与宣传/公告条目，不属于正文主线
const ALT_TITLE = /^第[A-Za-zⅠ-Ⅻ]+章|^第\s*章|新书|写在后面|最新章节|公告/;
function isPromo(title) {
  if (!title) return true;
  return ALT_TITLE.test(title);
}

// 同编号多版本：去掉末尾 上/中/下/（上）/{下}/[中] 标记后标题相同，视为同一章的前后半
const HALF_RE = /\s*[（({【\[｛]?[上中下]{1,2}[）)}】\]｝]?\s*$/;
function splitKey(t) {
  return (t || '').trim().replace(HALF_RE, '').trim();
}
function isSplitHalf(a, b) {
  const ka = splitKey(a), kb = splitKey(b);
  return ka && kb && ka === kb && a !== b;
}

// 封面 URL：https://www.biquge5.com/images/{cat}/{book}/{book}s.jpg
function coverUrl(bookUrl) {
  const m = (bookUrl || '').match(/(\d+)_(\d+)\/?$/);
  return m ? `https://www.biquge5.com/images/${m[1]}/${m[2]}/${m[2]}s.jpg` : '';
}

// 站点正文页脚注/广告垃圾行（每页末尾固定出现）
const JUNK_LINE = /手打小说网|广告\d+|抵制不良作品|注意自我判断|请勿模仿主角|适度阅读益脑|沉迷网络伤身|合理安排时间/;

// 干净正文：去掉 "第(N/M)页" 分页标记（行首或行尾）、站点脚注/广告行、空行、首尾空白
function cleanTxt(txt) {
  return (txt || '')
    .split('\n')
    .map(l => l.trim())
    .map(l => l.replace(/^第\(\d+\/\d+\)页\s*/, '').replace(/\s*第\(\d+\/\d+\)页$/, ''))
    .filter(l => l && !JUNK_LINE.test(l))
    .join('\n')
    .trim();
}

// ---------------------- 浏览器环境 ----------------------

// 确保共享浏览器页面位于 biquge5 域下（同源 fetch 才不受 CORS 限制）
async function ensureBq5Origin() {
  const page = await core.getBrowserPage();
  const host = await page.evaluate(() => location.hostname);
  if (host !== 'www.biquge5.com') {
    await page.goto(BQ5_SITE, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 800));
  }
  return page;
}

// ---------------------- 书籍信息 + 章节列表 ----------------------

async function getBook(url) {
  const base = url.trim().replace(/\/+$/, '');
  const m = base.match(/(\d+_\d+)$/);
  if (!m) throw new Error('无法识别的 biquge5 书籍链接（需形如 …/78_78365/）：' + url);

  const page = await ensureBq5Origin();
  const out = await page.evaluate(async (u) => {
    const fetchText = async (href) => { try { const r = await fetch(href); return r.ok ? await r.text() : null; } catch { return null; } };
    const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

    // 1) 书籍页信息
    const bookHtml = await fetchText(u + '/');
    if (!bookHtml) throw new Error('无法访问书籍页：' + u);
    const bdoc = parse(bookHtml);
    const title = (bdoc.querySelector('h1, .book h1, .info h1') || {}).textContent || '';
    const pageText = (bdoc.body && bdoc.body.textContent) || '';
    const authorM = pageText.match(/作者[：:]\s*([^\s，。；]{1,20})/);
    const author = authorM ? authorM[1] : '';

    // 状态（完本/连载）、更新时间
    const infoEl = bdoc.querySelector('.info');
    const infoText = (infoEl ? infoEl.textContent : '') || '';
    const statusM = infoText.match(/状态[：:]\s*([^\s，。；]{1,8})/);
    const status = statusM ? statusM[1] : '';
    const updateM = infoText.match(/更新时间[：:]\s*([^\s，。；]{1,24})/);
    const lastUpdate = updateM ? updateM[1] : '';

    // 简介（去掉站点自带推广尾巴，如“㈠、作者 您要是觉得…推荐哦”）
    const introEl = bdoc.querySelector('.intro');
    let intro = introEl ? (introEl.textContent || '').trim().replace(/^简介[：:]\s*/, '') : '';
    intro = intro.replace(/([㈠]|您要是觉得|别忘了|请收藏|支持正版|推荐哦).*$/s, '').trim();

    // 2) 遍历目录分页收集全部章节（去重）
    const all = new Map();
    let pn = 1;
    while (pn <= 30) {
      const u2 = pn === 1 ? u + '/' : u + '/index_' + pn + '.html';
      const html = await fetchText(u2);
      if (!html) break;
      const d = parse(html);
      const links = [...d.querySelectorAll('a')]
        .filter(a => /\/\d+\.html$/.test(a.getAttribute('href') || ''))
        .map(a => ({ href: new URL(a.getAttribute('href'), u2).href, title: (a.textContent || '').trim() }));
      let added = 0;
      for (const l of links) if (!all.has(l.href)) { all.set(l.href, l.title); added++; }
      if (added === 0) break;
      pn++;
    }

    const chapters = [...all.entries()].map(([href, t]) => ({ href, title: t }));
    return { title, author, status, lastUpdate, intro, url: u, chapters };
  }, base);
  out.cover = coverUrl(base);
  return out;
}

// ---------------------- 搜索 ----------------------

// 站内搜索：GET /search.php?q=<kw>&p=1
async function searchBooks(keyword) {
  const page = await ensureBq5Origin();
  return page.evaluate(async (kw) => {
    const url = 'https://www.biquge5.com/search.php?q=' + encodeURIComponent(kw) + '&p=1';
    const r = await fetch(url);
    if (!r.ok) throw new Error('搜索接口 HTTP ' + r.status);
    const d = new DOMParser().parseFromString(await r.text(), 'text/html');
    const items = [];
    for (const a of [...d.querySelectorAll('a')]) {
      const m = (a.getAttribute('href') || '').match(/\/(\d+_\d+)\/$/);
      if (!m) continue;
      const li = a.closest('li, .result-item, div');
      const text = (li ? li.textContent : '') || '';
      const authorM = text.match(/作者[：:]\s*([^\s，。；]{1,16})/);
      const statusM = text.match(/状态[：:]\s*([^\s，。；]{1,8})/);
      const titleM = text.match(/\[[^\]]*\]\s*([^\s，。；]{1,30})/);
      const bookUrl = 'https://www.biquge5.com/' + m[1] + '/';
      const cid = m[1].split('_')[1];
      items.push({
        id: m[1],
        url: bookUrl,
        cover: `https://www.biquge5.com/images/${m[1].replace('_', '/')}/${cid}s.jpg`,
        title: titleM ? titleM[1] : ((a.textContent || '').trim().replace(/^\[[^\]]*\]/, '')),
        author: authorM ? authorM[1] : '',
        status: statusM ? statusM[1] : '',
      });
    }
    const seen = new Map();
    for (const it of items) if (!seen.has(it.id)) seen.set(it.id, it);
    return [...seen.values()].slice(0, 20);
  }, keyword);
}

// ---------------------- 正文（含分页） ----------------------

// 按顺序抓取一组章节（每章 1~N 页；4 并发 worker 抓取，实测不触发 biquge5 限流；内容过短时自动重试）
async function fetchChapters(hrefs) {
  const page = await ensureBq5Origin();
  const out = await page.evaluate(async (list) => {
    const results = new Array(list.length);
    let idx = 0;
    const fetchOne = async (u) => {
      let last = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const seen = new Set();
          const parts = [];
          let title = '';
          let url = u;
          let seq = 1;
          while (url && !seen.has(url) && seq <= 10) {
            seen.add(url);
            const r = await fetch(url);
            if (!r.ok) break;
            const d = new DOMParser().parseFromString(await r.text(), 'text/html');
            if (!title) {
              const h1 = d.querySelector('h1, .bookname h1');
              title = (h1 ? h1.textContent : '').trim();
            }
            const c = d.querySelector('.font_max, .showtxt, #content, .chapter-content, #chaptercontent, .read-content');
            if (c) parts.push(c.innerText);
            const next = [...d.querySelectorAll('a')].map(a => a.getAttribute('href'))
              .find(h => h && new RegExp('(\\d+)_' + (seq + 1) + '\\.html$').test(h));
            if (!next) break;
            url = new URL(next, u).href;
            seq++;
          }
          const txt = parts.join('\n');
          last = { title, txt };
          if (txt.replace(/\s+/g, '').length >= 80 || attempt === 3) break;
          await new Promise(r2 => setTimeout(r2, 800 * attempt));
        } catch (e) {
          last = { error: String(e.message || e) };
          if (attempt === 3) break;
          await new Promise(r2 => setTimeout(r2, 800 * attempt));
        }
      }
      return last || { error: '获取失败' };
    };
    const worker = async () => {
      while (idx < list.length) {
        const i = idx++;
        results[i] = await fetchOne(list[i]);
        await new Promise(r2 => setTimeout(r2, 60)); // 轻微间隔，降低触发限流概率
      }
    };
    await Promise.all(Array.from({ length: 4 }, () => worker()));
    return results;
  }, hrefs);
  return out;
}

// 抓取单章正文（hrefs 可含 上/下 多页，合并返回；内容经 cleanTxt 清理）
async function fetchChapter(urls) {
  const hrefs = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  const results = await fetchChapters(hrefs);
  const parts = [];
  let title = '';
  let error = '';
  for (const r of results) {
    if (!r) continue;
    if (r.error) { if (!error) error = r.error; continue; }
    if (r.title && !title) title = r.title;
    if (r.txt) parts.push(cleanTxt(r.txt));
  }
  if (!parts.length) return { title, txt: '', error: error || '获取失败' };
  return { title, txt: parts.join('\n\n'), error: '' };
}

// 下载计划：过滤宣传/字母编号条目，按编号去重（取目录首个，即正文主线），
// 同编号且仅分 上/中/下 的章节合并为前后半，返回主线 + 缺失编号
function buildDownloadPlan(chapters) {
  const byNum = new Map();
  for (const c of chapters || []) {
    if (isPromo(c.title)) continue;
    const n = parseChNum(c.title);
    if (!n) continue;
    if (!byNum.has(n)) byNum.set(n, { num: n, title: c.title, hrefs: [c.href] });
    else {
      const ex = byNum.get(n);
      if (isSplitHalf(ex.title, c.title)) ex.hrefs.push(c.href);
    }
  }
  const plan = [...byNum.values()].sort((a, b) => a.num - b.num);
  const nums = plan.map(p => p.num);
  const max = Math.max(...nums, 0);
  const set = new Set(nums);
  const missing = [];
  for (let i = 1; i <= max; i++) if (!set.has(i)) missing.push(i);
  return { plan, missing };
}

// 阅读目录：过滤宣传/字母编号条目，按编号去重（取目录首现版本），返回按编号升序的阅读列表。
// 同编号且分 上/中/下 的章节合并为一条（hrefs 多值），供阅读器整章渲染。
function buildReadingList(chapters) {
  const byNum = new Map();
  for (const c of chapters || []) {
    if (isPromo(c.title)) continue;
    const n = parseChNum(c.title);
    if (!n) continue;
    if (!byNum.has(n)) byNum.set(n, { num: n, title: c.title, hrefs: [c.href] });
    else {
      const ex = byNum.get(n);
      if (isSplitHalf(ex.title, c.title)) ex.hrefs.push(c.href);
    }
  }
  return [...byNum.values()].sort((a, b) => a.num - b.num);
}

// 按下载计划批量抓正文并重组（含前后半合并）
async function fetchPlan(plan) {
  const flat = [];
  for (const p of plan) for (const h of p.hrefs) flat.push(h);
  const results = await fetchChapters(flat);
  const out = [];
  let idx = 0;
  for (const p of plan) {
    const parts = [];
    let title = p.title;
    let error = '';
    for (let k = 0; k < p.hrefs.length; k++, idx++) {
      const r = results[idx];
      if (r && r.error) { error = r.error; continue; }
      if (r && r.txt) parts.push(cleanTxt(r.txt));
      if (r && r.title && k === 0) title = r.title;
    }
    out.push({ title, txt: parts.join('\n\n'), error });
  }
  return out;
}

// 污染特征检测（沿用主站的经验标记，用于下载时预警）
const DIRTY = /搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/;
function isDirty(txt) { return DIRTY.test(txt || ''); }

// 章节排序：有编号的按编号升序（正文主线），无编号的（番外/公告）排在最后
function sortChapters(chapters) {
  return chapters.slice().sort((a, b) => {
    const na = parseChNum(a.title), nb = parseChNum(b.title);
    if (na && nb) return na - nb;
    if (na) return -1;
    if (nb) return 1;
    return 0;
  });
}

// 缺失章节（编号 1..max 中未收集到的）
function missingChapters(chapters) {
  const nums = chapters.map(c => parseChNum(c.title)).filter(n => n > 0);
  const max = Math.max(...nums, 0);
  const set = new Set(nums);
  const missing = [];
  for (let i = 1; i <= max; i++) if (!set.has(i)) missing.push(i);
  return missing;
}

module.exports = {
  BQ5_SITE, parseChNum, cnToNum, cleanTxt, isDirty, coverUrl, isPromo,
  getBook, searchBooks, fetchChapters, fetchPlan, buildDownloadPlan,
  buildReadingList, fetchChapter,
  sortChapters, missingChapters,
};
