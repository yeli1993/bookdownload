// 深测 biquge5.com 兽血沸腾：章节排序 + 正文分页结构
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BOOK = 'https://www.biquge5.com/78_78365/';

const CN = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
function cnToNum(str) {
  if (!str) return 0;
  let total = 0, num = 0;
  for (const ch of str) {
    if (CN[ch] !== undefined) num = CN[ch];
    else if (ch === '十') { total += (num || 1) * 10; num = 0; }
    else if (ch === '百') { total += (num || 1) * 100; num = 0; }
  }
  return total + num;
}
function chNum(title) {
  const m = title.match(/第([零一二三四五六七八九十百]+)章/);
  return m ? cnToNum(m[1]) : 0;
}

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

    // 1) 收集全部章节
    const all = [];
    for (let pn = 1; pn <= 8; pn++) {
      const url = pn === 1 ? BOOK : BOOK.replace(/\/$/, '') + '/index_' + pn + '.html';
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 800));
      const chs = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a')]
          .filter(a => /\/78_78365\/\d+\.html$/.test(a.href))
          .map(a => ({ href: a.href, text: a.textContent.trim() }));
        return [...new Map(links.map(l => [l.href, l])).values()];
      });
      // 打印每页标题范围，判断排序
      const nums = chs.map(c => chNum(c.text));
      const named = nums.filter(n => n > 0);
      console.log(`分页${pn}: ${chs.length}章  编号范围[${Math.min(...named)}..${Math.max(...named)}]  无编号=${chs.filter(c => chNum(c.text) === 0).length}`);
      for (const c of chs) if (!all.find(x => x.href === c.href)) all.push(c);
    }
    console.log('总章节:', all.length);

    // 2) 排序分析
    const numbered = all.filter(c => chNum(c.text) > 0);
    const nums = numbered.map(c => chNum(c.text)).sort((a, b) => a - b);
    const uniq = [...new Set(nums)];
    const missing = [];
    for (let i = 1; i <= uniq[uniq.length - 1]; i++) if (!uniq.includes(i)) missing.push(i);
    console.log(`有编号章节=${numbered.length} 去重=${uniq.length} 最大编号=${uniq[uniq.length - 1]} 缺失=${JSON.stringify(missing.slice(0, 30))}`);

    // 看无编号章节是什么
    console.log('无编号章节示例:', all.filter(c => chNum(c.text) === 0).slice(0, 10).map(c => c.text));

    // 3) 正文分页结构探测：抓一章节页，看导航链接
    const ch = numbered.find(c => chNum(c.text) === 100) || numbered[0];
    console.log('\n测试章节:', ch.text, ch.href);
    await page.goto(ch.href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));
    const nav = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')].map(a => ({ t: a.textContent.trim(), h: a.href }))
        .filter(x => /第.*页|下一.*页|上一.*页|下一页|上一页/.test(x.t) || /(_\d+)\.html$/.test(x.h));
      const content = document.querySelector('.showtxt, #content, #chaptercontent, .content') || {};
      return { links: links.slice(0, 10), contentSel: content.className || content.id, contentLen: (content.innerText || '').length };
    });
    console.log('导航链接:', JSON.stringify(nav, null, 1));
  } finally {
    await browser.close();
  }
})();
