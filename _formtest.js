// 读取各站点首页搜索表单结构，找出正确的搜索 URL
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SITES = [
  'https://www.biquge5.com',
  'https://www.biquge.so',
  'https://www.88biquge.com',
  'https://www.xbiquge.bz',
  'https://www.bqg99.cc',
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    for (const home of SITES) {
      console.log('\n===== ' + home + ' =====');
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
      await page.goto(home, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
      const forms = await page.evaluate(() => {
        return [...document.querySelectorAll('form')].map(f => ({
          action: f.action || '',
          method: f.method || 'get',
          inputName: (f.querySelector('input[type=text], input:not([type])') || {}).name || (f.querySelector('input') || {}).name || '',
          inputId: (f.querySelector('input') || {}).id || '',
        }));
      });
      console.log('表单:', JSON.stringify(forms));
      const searchInputs = await page.evaluate(() => {
        return [...document.querySelectorAll('input')].map(i => ({ name: i.name, id: i.id, type: i.type, placeholder: i.placeholder })).filter(i => i.type === 'text' || i.type === 'search');
      });
      console.log('搜索输入框:', JSON.stringify(searchInputs));
      await page.close();
    }
  } finally {
    await browser.close();
  }
})();
