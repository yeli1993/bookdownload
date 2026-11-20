// biquge5.com 兽血沸腾：完整章节列表(含分页) + 正文选择器 + 多章节抽查
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BOOK = 'https://www.biquge5.com/78_78365/';

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
    await new Promise(r => setTimeout(r, 800));
    await page.goto(BOOK, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));

    // 1) 看分页结构
    const pagination = await page.evaluate(() => {
      const idx = [...document.querySelectorAll('a')].filter(a => /index_\d+\.html/.test(a.href)).map(a => a.href);
      return [...new Set(idx)];
    });
    console.log('分页链接:', pagination);

    // 2) 收集全部章节链接（遍历分页）
    const allChs = [];
    let pageNum = 1;
    while (true) {
      const url = pageNum === 1 ? BOOK : BOOK.replace(/\/$/, '') + '/index_' + pageNum + '.html';
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 900));
      const chs = await page.evaluate(() => {
        const list = document.querySelector('.listmain, .chapter-list, .box_con .listmain, .section-list, .catalog, .list, ul');
        const links = [...document.querySelectorAll('a')].filter(a => /\/\d+\.html$/.test(a.href) && !/index/.test(a.href) && !/book\//.test(a.href)).map(a => ({ href: a.href, text: a.textContent.trim() }));
        return [...new Map(links.map(l => [l.href, l])).values()];
      });
      if (!chs.length) break;
      const before = allChs.length;
      for (const c of chs) if (!allChs.find(x => x.href === c.href)) allChs.push(c);
      console.log(`  分页${pageNum}: 新增 ${allChs.length - before} 个章节，当前总数 ${allChs.length}`);
      if (pageNum > 1 && chs.length === 0) break;
      pageNum++;
      if (pageNum > 60) break; // 保护
    }

    console.log('\n总章节数:', allChs.length);
    console.log('第1章:', JSON.stringify(allChs[0]));
    console.log('第10章:', JSON.stringify(allChs[9]));
    console.log('第100章:', JSON.stringify(allChs[99]));
    console.log('最后章:', JSON.stringify(allChs[allChs.length - 1]));

    // 3) 抽查若干章内容（用正确选择器）
    const picks = [0, 9, 99, 299, allChs.length - 1];
    for (const idx of picks) {
      const ch = allChs[idx];
      if (!ch) continue;
      await page.goto(ch.href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      const r = await page.evaluate(() => {
        const contentSel = document.querySelector('#content, .content, #chaptercontent, .read-content, #booktext, .article-content, .showtxt');
        // 尝试从HTML里抠出正文
        let txt = '';
        if (contentSel) txt = contentSel.innerText.trim();
        // 兜底：找最长的段落块
        if (!txt) {
          const cand = [...document.querySelectorAll('div, p')].filter(e => e.innerText.trim().length > 300);
          if (cand.length) txt = cand.sort((a, b) => b.innerText.length - a.innerText.length)[0].innerText.trim();
        }
        return { txt: txt.slice(0, 120), len: txt.length, selector: contentSel ? contentSel.className || contentSel.id : '' };
      });
      console.log(`\n[${idx}] ${ch.text} -> ${tag(r.txt)} 选择器=${r.selector} len=${r.len}`);
      console.log('  正文:', JSON.stringify(r.txt.replace(/\s+/g, '').slice(0, 60)));
    }
  } finally {
    await browser.close();
  }
})();
