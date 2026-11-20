// 输出书籍页1所有章节链接及其所在容器 class
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
    await page.goto(BOOK, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    const res = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')].filter(a => /\/78_78365\/\d+\.html$/.test(a.href));
      // 找到每个链接的最近容器（含 class 的 li/div/ul）
      const out = links.map(a => {
        let p = a;
        let container = '';
        for (let i = 0; i < 4 && p; i++) {
          p = p.parentElement;
          if (p && (p.className || p.tagName === 'LI' || p.tagName === 'UL')) {
            container = (p.className && typeof p.className === 'string' ? p.className : p.tagName);
            break;
          }
        }
        return { h: a.href.split('/').pop(), t: a.textContent.trim().slice(0, 24), c: container.slice(0, 30) };
      });
      return out;
    });
    const groups = new Map();
    for (const x of res) { if (!groups.has(x.c)) groups.set(x.c, []); groups.get(x.c).push(x); }
    console.log('总链接数:', res.length);
    for (const [c, arr] of groups) {
      console.log(`\n容器 [${c}] ${arr.length}个:`);
      arr.slice(0, 4).forEach(x => console.log(`   ${x.h} ${x.t}`));
      if (arr.length > 4) console.log(`   ... 末尾: ${arr[arr.length - 1].h} ${arr[arr.length - 1].t}`);
    }
  } finally {
    await browser.close();
  }
})();
