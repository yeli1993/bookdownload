// 分别输出 .book_list 与 .book_list2 的章节标题前若干
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
      const grab = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return [];
        return [...el.querySelectorAll('a')].filter(a => /\/\d+\.html$/.test(a.href))
          .slice(0, 15).map(a => ({ t: a.textContent.trim().slice(0, 40), h: a.href.split('/').pop() }));
      };
      return {
        book_list: grab('.book_list'),
        book_list2: grab('.book_list2'),
      };
    });
    console.log('== .book_list (其他作品/推荐) ==');
    res.book_list.forEach(x => console.log(' ', x.h, x.t));
    console.log('== .book_list2 (本书目录) ==');
    res.book_list2.forEach(x => console.log(' ', x.h, x.t));
  } finally {
    await browser.close();
  }
})();
