const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    // 打开 6289 第100章的真实页面，看 SPA 自己显示什么
    await page.goto('https://www.bqg713.cc/#/book/6289/100.html', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));
    const info = await page.evaluate(() => {
      const t = document.querySelector('#title, h1');
      const c = document.querySelector('#chaptercontent');
      return {
        title: t ? t.textContent.trim() : '',
        body: c ? c.innerText.slice(0, 200) : '(无chaptercontent)',
      };
    });
    console.log('真实页面 章节标题:', JSON.stringify(info.title));
    console.log('真实页面 正文前200:', JSON.stringify(info.body));
    console.log('真实页面 标记:', tag(info.body));
  } finally {
    await browser.close();
  }
})();
