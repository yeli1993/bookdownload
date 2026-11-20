const core = require('./lib/core');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const sb = core.loadJS();
  const url = core.apiUrl('chapter', { id: 2530, chapterid: 1 });
  console.log('URL:', url);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    // 直接导航 apibi 接口
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('导航状态:', resp && resp.status());
    const text = await page.evaluate(() => document.body.innerText);
    try {
      const d = JSON.parse(text);
      const txt = d.txt || '';
      console.log('✅ 返回正文开头:', JSON.stringify(txt.slice(0, 40)));
      console.log('✅ 章节名:', d.chaptername, '| 长度:', txt.length);
    } catch {
      console.log('❌ 非JSON:', text.slice(0, 150));
    }
  } finally {
    await browser.close();
  }
})();
