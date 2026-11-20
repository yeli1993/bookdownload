// 探测 biquge5 搜索接口
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

    const candidates = [
      'https://www.biquge5.com/search.php?keyword=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE',
      'https://www.biquge5.com/search.html?key=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE&s=0',
      'https://www.biquge5.com/search/?key=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE',
      'https://www.biquge5.com/modules/article/search.php?searchkey=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE',
    ];
    for (const u of candidates) {
      try {
        const r = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r2 => setTimeout(r2, 1000));
        const res = await page.evaluate(() => {
          const links = [...document.querySelectorAll('a')]
            .filter(a => /biquge5\.com\/\d+_\d+\/$/.test(a.href))
            .slice(0, 5).map(a => ({ href: a.href, t: a.textContent.trim().slice(0, 30) }));
          const title = document.title.slice(0, 40);
          return { title, links };
        });
        console.log(`OK ${u}`);
        console.log('  title:', res.title);
        console.log('  links:', JSON.stringify(res.links));
        break;
      } catch (e) {
        console.log(`ERR ${u} -> ${e.message.slice(0, 50)}`);
      }
    }
  } finally {
    await browser.close();
  }
})();
