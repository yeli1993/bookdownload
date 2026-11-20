/**
 * 共享核心逻辑：站点 JS 加载（vm 沙箱生成 token）+ API 请求 + 文本格式化
 * 被 CLI(downloader.js) 与 Web 服务(server.js) 共同复用
 */
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SITE = 'https://www.bqg713.cc/';
const API_HOST = 'https://apibi.cc';
const LIB = __dirname; // core.js 与 read.js/common.js 同处 lib/
const READ_JS = path.join(LIB, 'read.js');
const COMMON_JS = path.join(LIB, 'common.js');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Referer': SITE, 'Accept': '*/*' };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------- 站点 JS 加载（vm 沙箱） ----------------------

function jqStub() {
  const c = {};
  ['ready', 'on', 'off', 'each', 'html', 'text', 'click', 'attr', 'val',
   'show', 'hide', 'css', 'append', 'bind', 'addClass', 'removeClass',
   'remove', 'scrollTop', 'post', 'getJSON'].forEach(m => { c[m] = () => c; });
  return c;
}

function buildSandbox() {
  const sb = {
    console,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    parseInt, parseFloat, isNaN, isFinite,
    Math, Date, String, Number, Boolean, Array, Object, RegExp, Error, JSON,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, Function,
    navigator: { userAgent: UA },
    location: { href: SITE, hash: '#/', host: 'www.bqg713.cc', pathname: '/', hostname: 'www.bqg713.cc' },
    document: { cookie: '', addEventListener: () => {}, getElementById: () => null, getElementsByTagName: () => [] },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
    $: jqStub, jQuery: jqStub,
    getCookie: () => '', setCookie: () => {},
  };
  sb.window = sb; sb.self = sb; sb.globalThis = sb;
  return sb;
}

let _ctx = null;
function loadJS() {
  if (_ctx) return _ctx;
  if (!fs.existsSync(READ_JS) || !fs.existsSync(COMMON_JS)) {
    throw new Error(`站点 JS 不存在：${LIB}。请先刷新（CLI: --refresh-js / Web: 刷新按钮）`);
  }
  const sb = buildSandbox();
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(READ_JS, 'utf8'), sb, { filename: 'read.js' });
  vm.runInContext(fs.readFileSync(COMMON_JS, 'utf8'), sb, { filename: 'common.js' });
  _ctx = sb;
  return sb;
}

// 生成带 token 的 API URL
function apiUrl(api, params) {
  const sb = loadJS();
  return vm.runInContext(`get_api(${JSON.stringify(api)}, ${JSON.stringify(params)})`, sb);
}

async function refreshJS() {
  const idx = await httpGet(SITE);
  const urls = [];
  const re = /src="(\/js\/[^"]+\.js[^"]*)"/g;
  let m;
  while ((m = re.exec(idx)) !== null) {
    const p = m[1].split('?')[0];
    if (p.endsWith('/read.js') || p.endsWith('/common.js')) urls.push(new URL(p, SITE).href);
  }
  if (urls.length < 2) throw new Error('未能从首页解析出 read.js / common.js');
  fs.mkdirSync(LIB, { recursive: true });
  const saved = [];
  for (const u of urls) {
    const name = u.split('/js/')[1].split('?')[0];
    fs.writeFileSync(path.join(LIB, name), await httpGet(u), 'utf8');
    saved.push(name);
  }
  _ctx = null; // 重置沙箱
  return saved;
}

// ---------------------- HTTP ----------------------

async function httpGet(url, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return await res.text();
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      throw new Error(`HTTP ${res.status} @ ${url}`);
    } catch (e) {
      if (i === retries) throw e;
      await sleep(400 * i);
    }
  }
}

async function apiGet(api, params) {
  const text = await httpGet(apiUrl(api, params));
  try { return JSON.parse(text); }
  catch { throw new Error(`接口返回非 JSON：${text.slice(0, 120)}`); }
}

// ---------------------- 业务 API ----------------------

async function searchBooks(keyword) {
  const text = await httpGet(`${API_HOST}/api/search?q=${encodeURIComponent(keyword)}`);
  const data = JSON.parse(text);
  return Array.isArray(data.data) ? data.data : [];
}

async function getBookInfo(id) {
  return apiGet('book', { id: Number(id) });
}

async function getChapter(id, chapterid) {
  return apiGet('chapter', { id: Number(id), chapterid: Number(chapterid) });
}

// ---------------------- 浏览器抓取（绕过 apibi Bot 检测） ----------------------
// apibi 对非浏览器请求返回污染数据（色情/水印），必须用真实浏览器环境抓正文。

let _browser = null;
let _bpage = null;
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function getBrowserPage() {
  if (_bpage) return _bpage;
  if (!fs.existsSync(CHROME_PATH) && !fs.existsSync(EDGE_PATH)) {
    throw new Error('未找到 Chrome/Edge，无法使用浏览器抓取模式');
  }
  const puppeteer = require('puppeteer-core');
  const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
  _browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN', '--disable-dev-shm-usage'],
  });
  _bpage = await _browser.newPage();
  await _bpage.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
  await _bpage.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  return _bpage;
}

async function closeBrowser() {
  if (_browser) { try { await _browser.close(); } catch {} }
  _browser = null; _bpage = null;
}

// 在浏览器环境批量抓取章节正文（串行 fetch，一次 evaluate 抓多个）
async function fetchChaptersViaBrowser(urls) {
  const page = await getBrowserPage();
  return page.evaluate(async (list) => {
    const out = [];
    for (const u of list) {
      try {
        const r = await fetch(u);
        if (!r.ok) { out.push({ error: 'HTTP ' + r.status }); continue; }
        out.push(await r.json());
      } catch (e) {
        out.push({ error: String(e.message || e) });
      }
      await new Promise(r2 => setTimeout(r2, 60));
    }
    return out;
  }, urls);
}

// 书籍封面 URL（来自站点 common.js url_img）
function coverUrl(id) {
  id = Number(id);
  return `${SITE}bookimg/${Math.floor(id / 1000)}/${id}.jpg`;
}

function safeName(s) {
  return (s || 'unknown').replace(/[\\/:*?"<>|]/g, '_').trim();
}

// 章节正文格式化：每段加全角缩进
function formatChapter(chaptername, txt) {
  const body = (txt || '').split('\n').map(l => l.trim() ? '　　' + l.trim() : l).join('\n');
  return `\n${chaptername}\n\n${body}\n`;
}

module.exports = {
  SITE, API_HOST, UA, HEADERS,
  loadJS, apiUrl, refreshJS, httpGet,
  searchBooks, getBookInfo, getChapter, coverUrl,
  getBrowserPage, closeBrowser, fetchChaptersViaBrowser,
  safeName, formatChapter, sleep,
};
