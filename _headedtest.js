const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼|李洛|大夏国/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  // 有头模式（真实窗口），验证污染是否与 headless 检测有关
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN', '--window-size=1000,700'],
  });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    await page.goto('https://www.bqg713.cc/#/book/6289/100.html', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3500));
    const info = await page.evaluate(() => {
      const t = document.querySelector('#title, h1');
      const c = document.querySelector('#chaptercontent');
      return { title: t ? t.textContent.trim() : '', body: c ? c.innerText.slice(0, 120) : '(无)' };
    });
    console.log('有头模式 章节标题:', JSON.stringify(info.title));
    console.log('有头模式 正文前120:', JSON.stringify(info.body));
    console.log('有头模式 标记:', tag(info.body));
  } finally {
    await browser.close();
  }
})();
