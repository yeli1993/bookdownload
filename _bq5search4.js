// 查看 biquge5 首页搜索表单结构
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.goto('https://www.biquge5.com', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const res = await page.evaluate(() => {
      const forms = [...document.querySelectorAll('form')].map(f => ({
        action: f.getAttribute('action'), method: f.getAttribute('method'),
        inputs: [...f.querySelectorAll('input')].map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder })),
      }));
      const searchLinks = [...document.querySelectorAll('a')].filter(a => /search/i.test(a.href)).slice(0, 5).map(a => a.href);
      return { forms, searchLinks };
    });
    console.log(JSON.stringify(res, null, 1));
  } finally {
    await browser.close();
  }
})();
