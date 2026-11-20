const core = require('./lib/core');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  // 对比 bqg713 与姊妹站 bqg78 对同一本书 6289 第100章的返回
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });

    // bqg713 页面正文
    await page.goto('https://www.bqg713.cc/#/book/6289/100.html', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2500));
    const b713 = await page.evaluate(() => {
      const c = document.querySelector('#chaptercontent');
      return c ? c.innerText.slice(0, 80) : '(无)';
    });
    console.log('bqg713 章100:', tag(b713), JSON.stringify(b713.slice(0, 40)));

    // bqg78 页面正文（姊妹站，同 JS 体系）
    await page.goto('https://www.bqg78.com/#/book/6289/100.html', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2500));
    const b78 = await page.evaluate(() => {
      const c = document.querySelector('#chaptercontent');
      return c ? c.innerText.slice(0, 80) : '(无)';
    });
    console.log('bqg78  章100:', tag(b78), JSON.stringify(b78.slice(0, 40)));
  } finally {
    await browser.close();
  }
})();
