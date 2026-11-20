// 列出页面所有 UL 目录块：class、标题范围、首末章节
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
      const uls = [...document.querySelectorAll('ul')].filter(u => u.querySelectorAll('a[href*="78_78365/"]').length >= 3);
      return uls.map(u => {
        const chs = [...u.querySelectorAll('a')].filter(a => /\/78_78365\/\d+\.html$/.test(a.href));
        const prev = u.previousElementSibling;
        const heading = prev ? (prev.textContent || '').trim().slice(0, 20) : '';
        return {
          cls: (u.className || '').slice(0, 30),
          heading,
          count: chs.length,
          firstId: chs[0] ? chs[0].href.split('/').pop() : '',
          firstT: chs[0] ? chs[0].textContent.trim().slice(0, 20) : '',
          lastT: chs[chs.length - 1] ? chs[chs.length - 1].textContent.trim().slice(0, 20) : '',
        };
      });
    });
    res.forEach((b, i) => console.log(`UL${i} [${b.cls}] 标题="${b.heading}" count=${b.count} 首=${b.firstT}(id${b.firstId}) ... 末=${b.lastT}`));
  } finally {
    await browser.close();
  }
})();
