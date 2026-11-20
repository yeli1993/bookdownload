// 探测 biquge5 书籍页的详情结构（标题/作者/状态/简介/封面容器 class）
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
    await new Promise(r => setTimeout(r, 2000));
    const res = await page.evaluate(() => {
      const grab = (sel) => {
        const el = document.querySelector(sel);
        return el ? (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200) : null;
      };
      const h1 = document.querySelector('h1');
      const infos = [...document.querySelectorAll('div')].map(d => d.className || '');
      const cls = new Set(infos.filter(c => /info|intro|book|detail|desc|main|header|crumb/i.test(c)).slice(0, 30));
      return {
        h1: h1 ? h1.textContent.trim() : null,
        h1Parent: h1 && h1.parentElement ? (h1.parentElement.className || h1.parentElement.tagName) : null,
        '.book .info': grab('.book .info'),
        '#info': grab('#info'),
        '.info': grab('.info'),
        '.intro': grab('.intro'),
        '#intro': grab('#intro'),
        '.desc': grab('.desc'),
        '.book_detail': grab('.book_detail'),
        coverImg: (document.querySelector('.book img, .cover img, .detail img') || {}).src || '',
        classes: [...cls],
      };
    });
    console.log(JSON.stringify(res, null, 2));
  } finally {
    await browser.close();
  }
})();
