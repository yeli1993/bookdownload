const core = require('./lib/core');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function polluted(txt) {
  return /搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|刘震撼/i.test(txt || '') ? null : false;
}
// 简化：直接用标记判断
function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  const cids = [1, 100, 300, 500, 700, 790];
  const plain = cids.map(c => core.apiUrl('chapter', { id: 6289, chapterid: c }));
  const busted = plain.map((u, i) => u + (u.includes('?') ? '&' : '?') + '_=' + Date.now() + '_' + cids[i]);

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
          const r = await fetch(u, { cache: 'no-store' });
          const d = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
          res.push({ txt: (d && d.txt) || '', err: d && d.error ? d.error : '' });
        } catch (e) {
          res.push({ txt: '', err: String(e.message || e) });
        }
        await new Promise(r2 => setTimeout(r2, 150));
      }
      return res;
    }, plain.concat(busted));

    for (let i = 0; i < cids.length; i++) {
      const p = out[i];
      const b = out[i + cids.length];
      const pTag = p.err ? `ERR(${p.err})` : tag(p.txt);
      const bTag = b.err ? `ERR(${b.err})` : tag(b.txt);
      console.log(`章${cids[i]}:  普通=${pTag} 前缀=${JSON.stringify((p.txt||'').slice(0,18))}  |  缓存bust=${bTag} 前缀=${JSON.stringify((b.txt||'').slice(0,18))}`);
    }
  } finally {
    await browser.close();
  }
})();
