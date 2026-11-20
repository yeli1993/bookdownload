// 查 biquge5 书籍封面 URL 模式
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.goto('https://www.biquge5.com/78_78365/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const res = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')].map(i => i.src).filter(s => s && !/logo|ico|sprite/i.test(s)).slice(0, 6);
      const info = document.querySelector('.info, .book_info, .book, .detail') || {};
      return { imgs, infoText: (info.innerText || '').replace(/\s+/g, ' ').slice(0, 200) };
    });
    console.log('imgs:', JSON.stringify(res.imgs, null, 1));
    console.log('info:', res.infoText);
  } finally {
    await browser.close();
  }
})();
