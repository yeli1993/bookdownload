// 看 biquge5 首页标题 DOM 顺序 + 单章分页正文结构
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BOOK = 'https://www.biquge5.com/78_78365/';

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

    // 1) 首页标题 DOM 顺序（前25个）
    await page.goto(BOOK, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const titles = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')]
        .filter(a => /\/78_78365\/\d+\.html$/.test(a.href))
        .map(a => ({ h: a.href, t: a.textContent.trim() }));
      return [...new Map(links.map(l => [l.h, l])).values()].slice(0, 25);
    });
    console.log('首页章节标题顺序(前25):');
    titles.forEach((x, i) => console.log(`  ${i}. ${x.t}`));

    // 2) 单章分页结构：抓 188183.html（首章"静官新书已上传"）
    const first = titles[0] || { h: 'https://www.biquge5.com/78_78365/188183.html' };
    console.log('\n打开:', first.h, first.t);
    await page.goto(first.h, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const st = await page.evaluate(() => {
      // 找正文容器：列出所有含长文本的 div/p
      const cands = [...document.querySelectorAll('div, p, article')]
        .filter(e => (e.innerText || '').trim().length > 100)
        .map(e => ({ cls: (e.className || e.id || '').toString().slice(0, 40), len: (e.innerText || '').trim().length, txt: (e.innerText || '').trim().slice(0, 40) }))
        .sort((a, b) => b.len - a.len)
        .slice(0, 5);
      // 所有 /_N.html 链接（分页）
      const pg = [...document.querySelectorAll('a')].map(a => a.href).filter(h => /_\d+\.html$/.test(h));
      return { cands, pagination: [...new Set(pg)] };
    });
    console.log('候选正文容器:', JSON.stringify(st.cands, null, 1));
    console.log('分页链接:', st.pagination);
  } finally {
    await browser.close();
  }
})();
