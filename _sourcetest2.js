// 精测 biquge5.com 的《兽血沸腾》(静官)：书页、章节数、抓第100章验证内容
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
    await page.goto('https://www.biquge5.com/search.php?q=' + encodeURIComponent('兽血沸腾 静官'), { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const results = await page.evaluate(() => {
      return [...document.querySelectorAll('.result-list li, .bookbox, .search-list li, ul li, tr')].map(li => {
        const a = li.querySelector('a');
        const t = li.innerText.replace(/\s+/g, ' ').slice(0, 120);
        return a ? { href: a.href, text: t } : null;
      }).filter(Boolean).filter(x => /兽血沸腾/.test(x.text));
    });
    console.log('搜索结果:', JSON.stringify(results, null, 1));

    // 找静官那本
    let bookLink = '';
    const r = results.find(x => /静官/.test(x.text));
    if (r) bookLink = r.href;
    if (!bookLink) {
      // 回退：搜索页找链接
      bookLink = await page.evaluate(() => {
        const a = [...document.querySelectorAll('a')].find(x => /兽血沸腾/.test(x.textContent) && /href/.test(x.outerHTML));
        return a ? a.href : '';
      });
    }
    console.log('选中的书页:', bookLink);
    if (!bookLink) { await browser.close(); return; }

    await page.goto(bookLink, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const info = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const author = document.querySelector('.info .small, .info small, .bookinfo .small, .small');
      const chs = [...document.querySelectorAll('.listmain a, dd a, .chapter-list a, a')].filter(a => /\.html$/.test(a.href) && /\d/.test(a.href)).map(a => a.href);
      return {
        title: h1 ? h1.textContent.trim() : '',
        author: author ? author.textContent.trim().slice(0, 40) : '',
        chCount: chs.length,
        lastCh: chs[chs.length - 1] || '',
        ch100: chs.filter(h => /(\d+)\.html$/.test(h) && Number(h.match(/(\d+)\.html$/)[1]) >= 90 && Number(h.match(/(\d+)\.html$/)[1]) <= 130)[0] || '',
      };
    });
    console.log('书页:', JSON.stringify(info, null, 1));

    // 抓两个章节验证
    const targets = [info.ch100 || info.lastCh, info.lastCh];
    for (const t of targets) {
      if (!t) continue;
      await page.goto(t, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1200));
      const body = await page.evaluate(() => {
        const sels = ['#content', '.content', '#chaptercontent', '.chapter-content', '#htmlContent', '.read-content', '#booktext', '.article-content'];
        for (const s of sels) { const el = document.querySelector(s); if (el && el.innerText.trim().length > 100) return el.innerText; }
        return document.body.innerText;
      });
      const chTitle = await page.evaluate(() => (document.querySelector('h1, .bookname h1, #chapter-title') || {}).textContent || '');
      console.log(`章节 ${t}: 标题=${JSON.stringify(chTitle.trim().slice(0, 30))} 标记=${tag(body)} 前40=${JSON.stringify(body.replace(/\s+/g, '').slice(0, 40))}`);
    }
  } finally {
    await browser.close();
  }
})();
