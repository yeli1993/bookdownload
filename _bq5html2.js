// 查看 biquge5 书籍页目录区结构，确定重复版本来源
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BOOK = 'https://www.biquge5.com/78_78365/';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(BOOK, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1800));
    const res = await page.evaluate(() => {
      // 列出所有含章节链接的容器区块（含 class/id 与首个章节标题）
      const blocks = [];
      const candidates = [...document.querySelectorAll('div, ul, ol, dl, section')]
        .filter(el => el.querySelectorAll && el.querySelectorAll('a[href*="78_78365/"]').length >= 3);
      for (const el of candidates) {
        const cls = (el.className && typeof el.className === 'string' ? el.className : '') + (el.id ? '#' + el.id : '');
        const chs = [...el.querySelectorAll('a')].filter(a => /\/78_78365\/\d+\.html$/.test(a.href));
        const first = (chs[0] && chs[0].textContent.trim()) || '';
        blocks.push({ tag: el.tagName, cls: cls.slice(0, 60), count: chs.length, first: first.slice(0, 30) });
      }
      // 去重：只看最外层块
      const seen = new Set();
      const top = blocks.filter(b => { const k = b.cls + b.first; if (seen.has(k)) return false; seen.add(k); return true; });
      return top.slice(0, 12);
    });
    res.forEach(b => console.log(`${b.tag} .${b.cls}  count=${b.count}  首章=${b.first}`));
  } finally {
    await browser.close();
  }
})();
