// 确认 biquge5 搜索接口与结果格式
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

    const urls = [
      'https://www.biquge5.com/search.html?key=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE',
      'https://www.biquge5.com/search.php?keyword=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE',
      'https://www.biquge5.com/search/?key=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE',
    ];
    for (const u of urls) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 1200));
        const res = await page.evaluate(() => {
          const links = [...document.querySelectorAll('a')]
            .filter(a => /\/\d+_\d+\/$/.test(a.href) && !/index/.test(a.href))
            .slice(0, 6)
            .map(a => ({ href: a.href, t: a.textContent.trim().slice(0, 40) }));
          const authorTxt = (document.body.innerText || '').match(/作者[：:]\s*(\S{1,10})/);
          return { title: document.title.slice(0, 30), links, author: authorTxt ? authorTxt[1] : '' };
        });
        console.log(`搜索 ${u.split('?')[1]}:`);
        console.log('  status:', res.title);
        console.log('  links:', JSON.stringify(res.links, null, 1));
        if (res.links.length) break;
      } catch (e) { console.log('ERR', u, e.message.slice(0, 60)); }
    }
  } finally {
    await browser.close();
  }
})();
