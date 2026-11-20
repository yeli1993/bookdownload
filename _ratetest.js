const core = require('./lib/core');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|22xsw/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|李洛|大夏国/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  const cids = [1, 50, 100, 300, 500, 700, 790];
  const urls = cids.map(c => core.apiUrl('chapter', { id: 6289, chapterid: c }));
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    await page.goto(core.SITE, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('站点导航:', e.message));
    // 每次请求间隔较长，观察是否受请求频率影响
    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      const info = await page.evaluate(async (url) => {
        const r = await fetch(url);
        let txt = '', cache = r.headers.get('cf-cache-status') || r.headers.get('cache-control') || '';
        try { const d = await r.json(); txt = d.txt || ''; } catch {}
        return { status: r.status, cache, txt };
      }, u);
      console.log(`章${cids[i]}: status=${info.status} cache=${info.cache || '-'} ${tag(info.txt)}  前缀=${JSON.stringify((info.txt||'').slice(0,20))}`);
      await new Promise(r => setTimeout(r, 3000)); // 每章间隔3秒
    }
  } finally {
    await browser.close();
  }
})();
