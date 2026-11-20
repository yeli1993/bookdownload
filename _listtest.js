const core = require('./lib/core');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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

    // 1) 检查污染章节内容是否完全一致（数据库注入特征）
    const urls = [100, 101, 102, 200, 400].map(c =>
      core.apiUrl('chapter', { id: 6289, chapterid: c }));
    const rs = await page.evaluate(async (list) => {
      const out = [];
      for (const u of list) {
        const r = await fetch(u);
        const d = r.ok ? await r.json() : {};
        out.push({ txt: d.txt || '', name: d.chaptername });
      }
      return out;
    }, urls);
    const texts = rs.map(r => r.txt);
    const allSame = texts.every(t => t === texts[0]);
    console.log('污染章节文本是否完全一致:', allSame);
    rs.forEach((r, i) => {
      console.log(`  章${[100,101,102,200,400][i]}: ${JSON.stringify(r.name)} len=${r.txt.length} 前缀=${JSON.stringify(r.txt.slice(0,12))}`);
    });

    // 2) booklist 结构
    const bl = await page.evaluate(async (u) => {
      const r = await fetch(u);
      return r.ok ? await r.json() : null;
    }, core.apiUrl('booklist', { id: 6289 }));
    console.log('booklist keys:', bl ? Object.keys(bl) : null);
    console.log('booklist.list 类型:', bl && bl.list ? (Array.isArray(bl.list) ? 'array len=' + bl.list.length : typeof bl.list) : bl && bl.cs ? 'cs len=' + bl.cs.length : '无list');
    const arr = bl && (bl.list || bl.cs || []);
    if (Array.isArray(arr)) {
      console.log('list[0]:', JSON.stringify(arr[0]));
      console.log('list[1]:', JSON.stringify(arr[1]));
      console.log('list[54]:', JSON.stringify(arr[54]));
      console.log('list[59]:', JSON.stringify(arr[59]));
      console.log('list[99]:', JSON.stringify(arr[99]));
    }
  } finally {
    await browser.close();
  }
})();
