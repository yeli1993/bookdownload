// 精测 biquge5.com 兽血沸腾(静官) 78_78365：章节数 + 第~100章与末章内容
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
    await new Promise(r => setTimeout(r, 800));
    await page.goto('https://www.biquge5.com/78_78365/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1800));
    const info = await page.evaluate(() => {
      const h1 = document.querySelector('h1, .book h1, .info h1');
      const meta = document.querySelector('.info .small, .bookinfo, .info') || {};
      const chs = [...document.querySelectorAll('a')]
        .filter(a => /\/\d+\.html$/.test(a.href))
        .map(a => a.href);
      const uniq = [...new Set(chs)];
      return {
        title: h1 ? h1.textContent.trim() : '',
        meta: (meta.textContent || '').replace(/\s+/g, ' ').slice(0, 80),
        chCount: uniq.length,
        first3: uniq.slice(0, 3),
        around100: uniq.filter(h => /(\d+)\.html$/.test(h) && Number(h.match(/(\d+)\.html$/)[1]) >= 100 && Number(h.match(/(\d+)\.html$/)[1]) <= 120),
        last3: uniq.slice(-3),
      };
    });
    console.log('书页:', JSON.stringify(info, null, 1));

    const targets = [info.around100[0], info.last3[0]].filter(Boolean);
    for (const t of targets) {
      await page.goto(t, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1200));
      const body = await page.evaluate(() => {
        const sels = ['#content', '.content', '#chaptercontent', '.chapter-content', '#htmlContent', '.read-content', '#booktext', '.article-content'];
        for (const s of sels) { const el = document.querySelector(s); if (el && el.innerText.trim().length > 100) return el.innerText; }
        return document.body.innerText;
      });
      const chTitle = await page.evaluate(() => (document.querySelector('h1, .bookname h1, #chapter-title') || {}).textContent || '');
      console.log(`\n章节 ${t}:`);
      console.log(`  标题=${JSON.stringify(chTitle.trim().slice(0, 40))}`);
      console.log(`  标记=${tag(body)}  前50=${JSON.stringify(body.replace(/\s+/g, '').slice(0, 50))}`);
    }
  } finally {
    await browser.close();
  }
})();
