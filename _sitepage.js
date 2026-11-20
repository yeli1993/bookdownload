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
    // 监听网络请求，观察 SPA 自己调用的 chapter 接口返回
    const apiResponses = [];
    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes('/api/chapter')) {
        try { apiResponses.push(await res.json()); } catch {}
      }
    });
    // 打开 6289 第 100 章页面
    await page.goto('https://www.bqg713.cc/#/book/6289/100.html', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 2000));
    const title = await page.evaluate(() => {
      const t = document.querySelector('#title, h1');
      return t ? t.textContent : '';
    });
    const body = await page.evaluate(() => {
      const c = document.querySelector('#chaptercontent');
      return c ? c.innerText.slice(0, 200) : '(无chaptercontent)';
    });
    console.log('页面标题:', title);
    console.log('页面正文前200字:', JSON.stringify(body));
    console.log('SPA自调chapter接口数:', apiResponses.length);
    for (const d of apiResponses.slice(0, 2)) {
      console.log('  -> chaptername:', d.chaptername, '| txt前缀:', JSON.stringify((d.txt || '').slice(0, 30)), '| len:', (d.txt || '').length);
    }
  } finally {
    await browser.close();
  }
})();
