// biquge5.com 精确定位静官《兽血沸腾》并验证章节内容
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function tag(txt) {
  if (/搜索素人视频|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼|比蒙|雄鹿|战歌|兽人/.test(txt || '')) return '干净';
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
    await page.goto('https://www.biquge5.com', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    await page.goto('https://www.biquge5.com/search.php?q=' + encodeURIComponent('兽血沸腾'), { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));

    // 列出所有含"兽血沸腾"的链接
    const links = await page.evaluate(() => {
      return [...document.querySelectorAll('a')]
        .filter(a => /兽血沸腾/.test(a.textContent))
        .map(a => ({ text: a.textContent.trim(), href: a.href }));
    });
    console.log('含兽血沸腾的链接:');
    links.forEach(l => console.log('  ', l.text, '->', l.href));

    // 选 静官 那本：文本恰好等于"兽血沸腾" 或 附近含静官
    let bookLink = '';
    const exact = links.find(l => l.text === '兽血沸腾');
    bookLink = exact ? exact.href : (links[links.length - 1] || {}).href || '';
    console.log('选中书页:', bookLink);
    if (!bookLink) { await browser.close(); return; }

    await page.goto(bookLink, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1800));
    const info = await page.evaluate(() => {
      const h1 = document.querySelector('h1, .book h1, .info h1');
      const author = document.querySelector('.info .small a, .small a, .bookinfo .small, .info p');
      // 章节链接
      const chs = [...document.querySelectorAll('a')]
        .filter(a => /chapter|novel\/\d+|\/\d+\.html$/.test(a.href))
        .map(a => a.href);
      const uniq = [...new Set(chs)];
      return {
        title: h1 ? h1.textContent.trim() : '',
        author: author ? author.textContent.trim().slice(0, 50) : '',
        chCount: uniq.length,
        first3: uniq.slice(0, 3),
        last3: uniq.slice(-3),
      };
    });
    console.log('书页:', JSON.stringify(info, null, 1));
  } finally {
    await browser.close();
  }
})();
