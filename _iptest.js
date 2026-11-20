const core = require('./lib/core');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|李洛|大夏国/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  const items = [
    ['6289/100', core.apiUrl('chapter', { id: 6289, chapterid: 100 })],
    ['2530/1', core.apiUrl('chapter', { id: 2530, chapterid: 1 })],
    ['2530/2', core.apiUrl('chapter', { id: 2530, chapterid: 2 })],
  ];
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    await page.goto(core.SITE, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('站点导航:', e.message));
    const out = await page.evaluate(async (list) => {
      const res = [];
      for (const u of list) {
        try {
          const r = await fetch(u);
          const d = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
          res.push({ txt: (d && d.txt) || '', err: d && d.error ? d.error : '' });
        } catch (e) { res.push({ txt: '', err: String(e.message || e) }); }
        await new Promise(r2 => setTimeout(r2, 200));
      }
      return res;
    }, items.map(i => i[1]));
    items.forEach((it, i) => {
      const r = out[i];
      const t = r.err ? `ERR(${r.err})` : tag(r.txt);
      console.log(`${it[0]}: ${t}  前缀=${JSON.stringify((r.txt||'').slice(0,24))}`);
    });
  } finally {
    await browser.close();
  }
})();
