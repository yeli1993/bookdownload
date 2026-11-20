// 测试 biquge5 /search.php?q= 结果格式
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.goto('https://www.biquge5.com/search.php?q=%E5%85%BD%E8%A1%80%E6%B2%B8%E8%85%BE&p=1', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const res = await page.evaluate(() => {
      const body = document.body.innerText.slice(0, 500);
      const links = [...document.querySelectorAll('a')]
        .filter(a => /\/\d+_\d+\/$/.test(a.href))
        .map(a => ({ href: a.href, t: a.textContent.trim().slice(0, 50) }));
      // 常见搜索列表结构
      const items = [...document.querySelectorAll('.result-item, .listmain, .hot, .box, .item, li')].slice(0, 6)
        .map(x => (x.innerText || '').replace(/\s+/g, ' ').slice(0, 60));
      return { title: document.title, bodyHead: body, links: [...new Map(links.map(l => [l.href, l])).values()].slice(0, 8), items };
    });
    console.log('title:', res.title);
    console.log('links:', JSON.stringify(res.links, null, 1));
    console.log('items:', JSON.stringify(res.items, null, 1));
  } finally {
    await browser.close();
  }
})();
