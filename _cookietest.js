const core = require('./lib/core');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    await page.goto(core.SITE, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

    // 1) 先访问书页设置 cookie/会话，再抓第100章
    await page.goto('https://www.bqg713.cc/#/book/6289/', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    const cookies = await page.cookies();
    console.log('书页cookie数量:', cookies.length, cookies.map(c => c.name).join(','));

    // 2) 普通URL抓第100章
    const url100 = core.apiUrl('chapter', { id: 6289, chapterid: 100 });
    const r1 = await page.evaluate(async (u) => {
      const r = await fetch(u);
      const d = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
      return { txt: (d.txt || ''), chaptername: d.chaptername, cache: r.headers.get('cf-cache-status') || '' };
    }, url100);
    console.log('访问书页后 章100:', tag(r1.txt), '名称=', JSON.stringify(r1.chaptername), 'cache=', r1.cache || '-');

    // 3) 带时间戳缓存bust
    const busted = url100 + '&_=' + Date.now();
    const r2 = await page.evaluate(async (u) => {
      const r = await fetch(u, { cache: 'no-store' });
      const d = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
      return { txt: (d.txt || ''), chaptername: d.chaptername, cache: r.headers.get('cf-cache-status') || '' };
    }, busted);
    console.log('缓存bust 章100:', tag(r2.txt), '名称=', JSON.stringify(r2.chaptername), 'cache=', r2.cache || '-');

    // 4) 先访问章节页(SPA自己抓) 再看cookie差异
    await page.goto('https://www.bqg713.cc/#/book/6289/100.html', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2500));
    const cookies2 = await page.cookies();
    console.log('章节页cookie数量:', cookies2.length, cookies2.map(c => c.name).join(','));
    const r3 = await page.evaluate(async (u) => {
      const r = await fetch(u, { cache: 'no-store' });
      const d = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
      return { txt: (d.txt || ''), chaptername: d.chaptername };
    }, url100 + '&_=' + Date.now() + '2');
    console.log('访问章节页后 章100:', tag(r3.txt), '名称=', JSON.stringify(r3.chaptername));

    // 5) 对比第55章（干净）
    const url55 = core.apiUrl('chapter', { id: 6289, chapterid: 55 });
    const r4 = await page.evaluate(async (u) => {
      const r = await fetch(u, { cache: 'no-store' });
      const d = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
      return { txt: (d.txt || ''), chaptername: d.chaptername };
    }, url55);
    console.log('对照 章55:', tag(r4.txt), '名称=', JSON.stringify(r4.chaptername));
  } finally {
    await browser.close();
  }
})();
