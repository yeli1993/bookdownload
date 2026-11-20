// 验证 biquge5 搜索机制 + 缺失章节是否存在
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    await page.goto('https://www.biquge5.com', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 800));

    // 1) 搜索机制
    const urls = ['https://www.biquge5.com/search.html?key=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE', 'https://www.biquge5.com/search.php?keyword=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE'];
    for (const u of urls) {
      try {
        const r = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r2 => setTimeout(r2, 1200));
        const res = await page.evaluate(() => {
          const items = [...document.querySelectorAll('.result-item, .search-list li, .bookbox, .listmain a, #booklist li')].slice(0, 8);
          const links = [...document.querySelectorAll('a')].filter(a => /book\/\d+_\d+\/$/.test(a.href)).slice(0, 8)
            .map(a => ({ href: a.href, t: a.textContent.trim().slice(0, 30) }));
          return { status: document.title.slice(0, 30), links };
        });
        console.log(`搜索 ${u.split('?')[1]}: status=${res.status}`);
        console.log('  结果:', JSON.stringify(res.links, null, 1));
        break; // 只测第一个能用的
      } catch (e) { console.log('  ERR', u, e.message.slice(0, 60)); }
    }

    // 2) 检查缺失章节 57 / 164 / 539 是否存在（用页面8的前后标题判断）
    await page.goto('https://www.biquge5.com/78_78365/index_8.html', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    const p8 = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')]
        .filter(a => /\/78_78365\/\d+\.html$/.test(a.href))
        .map(a => ({ h: a.href, t: a.textContent.trim() }));
      return [...new Map(links.map(l => [l.h, l])).values()];
    });
    console.log('\n页面8章节标题(全部):');
    p8.forEach((x, i) => console.log(`  ${i}. ${x.t}`));
  } finally {
    await browser.close();
  }
})();
