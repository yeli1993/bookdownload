// 精确查看 biquge5 章节页 HTML 结构：.font_max 全文 + 分页链接 + 尾部
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

    // 测两章：短章(可能1页) + 分页章
    const tests = ['https://www.biquge5.com/78_78365/188183.html'];
    for (const t of tests) {
      await page.goto(t, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1200));
      const info = await page.evaluate(() => {
        const f = document.querySelector('.font_max, .showtxt, #content, .chapter-content');
        const h1 = document.querySelector('h1');
        const pgLinks = [...document.querySelectorAll('a')].map(a => a.href).filter(h => /_\d+\.html$/.test(h));
        return {
          h1: h1 ? h1.textContent.trim() : '',
          sel: f ? (f.className || f.id) : '',
          innerText: f ? f.innerText : '',
          innerHTML_head: f ? f.innerHTML.slice(0, 400) : '',
          pgLinks: [...new Set(pgLinks)],
        };
      });
      console.log('===', t);
      console.log('h1:', JSON.stringify(info.h1));
      console.log('selector:', info.sel);
      console.log('分页:', info.pgLinks);
      console.log('--- innerText 全文 ---');
      console.log(JSON.stringify(info.innerText));
      console.log('--- innerHTML 头 400 ---');
      console.log(info.innerHTML_head);
    }
  } finally {
    await browser.close();
  }
})();
