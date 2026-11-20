// 探测多个笔趣阁镜像：搜索「兽血沸腾」→ 找书页 → 抓第100章判断内容是否干净
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SITES = [
  { name: 'biquge5', home: 'https://www.biquge5.com', search: u => `https://www.biquge5.com/search.php?q=${u}` },
  { name: '88biquge', home: 'https://www.88biquge.com', search: u => `https://www.88biquge.com/search/?searchkey=${u}` },
  { name: 'bqg99', home: 'https://www.bqg99.cc', search: u => `https://www.bgg99.cc/s?q=${u}` },
  { name: 'biquge.so', home: 'https://www.biquge.so', search: null, post: { url: 'https://www.biquge.so/search.html', field: 's' } },
];

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
    for (const site of SITES) {
      console.log('\n========== ' + site.name + ' ==========');
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
      await page.goto(site.home, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1200));

      if (site.post) {
        await page.goto(site.post.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 800));
        await page.type(`input[name=${site.post.field}]`, '兽血沸腾');
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 2500));
      } else {
        await page.goto(site.search(encodeURIComponent('兽血沸腾')), { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));
      }

      const text = await page.evaluate(() => document.body.innerText.slice(0, 2500));
      console.log('URL:', page.url());
      console.log('片段:', text.replace(/\n+/g, ' | ').slice(0, 300));
      if (!/兽血沸腾/.test(text)) { console.log('  未命中'); await page.close(); continue; }

      const bookLink = await page.evaluate(() => {
        const a = [...document.querySelectorAll('a')].find(x => /兽血沸腾/.test(x.textContent) && /href/.test(x.outerHTML));
        return a ? a.href : '';
      });
      console.log('书页链接:', bookLink || '(无)');
      if (!bookLink) { await page.close(); continue; }

      await page.goto(bookLink, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
      const title = await page.evaluate(() => (document.querySelector('h1, .info h1, .book h1, .tit') || {}).textContent || '');
      const chLinks = await page.evaluate(() => [...document.querySelectorAll('dd a, .listmain a, .catalog a, a')].map(a => a.href).filter(h => /\.html$/.test(h) && /\d/.test(h)));
      console.log('书页标题:', title.trim().slice(0, 30), '| 章节链接数:', chLinks.length);
      // 找第100章
      let target = '';
      for (const l of chLinks) {
        const m = l.match(/(\d+)\.html$/);
        if (m && Number(m[1]) >= 90 && Number(m[1]) <= 120) { target = l; break; }
      }
      target = target || chLinks[0];
      console.log('测试章节:', target);
      if (!target) { await page.close(); continue; }
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1200));
      const body = await page.evaluate(() => {
        const sels = ['#content', '.content', '#chaptercontent', '.chapter-content', '#htmlContent', '.read-content', '#booktext', '.article-content'];
        for (const s of sels) { const el = document.querySelector(s); if (el && el.innerText.trim().length > 100) return el.innerText; }
        return document.body.innerText;
      });
      const chTitle = await page.evaluate(() => (document.querySelector('h1, .bookname h1, #chapter-title') || {}).textContent || '');
      console.log(`章节标题: ${JSON.stringify(chTitle.trim().slice(0, 30))}`);
      console.log(`正文前40: ${JSON.stringify(body.slice(0, 40))}  标记: ${tag(body)}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})();
