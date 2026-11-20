const core = require('./lib/core');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BOOK_ID = 6289;
const CID = 1;

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|李洛|大夏国/.test(txt || '')) return '干净';
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
    page.on('console', m => { if (m.type() === 'error') console.log('[page-error]', m.text().slice(0, 200)); });

    // 1) 打开真实网站书页，看书籍信息（书名/作者）
    await page.goto(`https://www.bqg713.cc/#/book/${BOOK_ID}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 2500));
    const info = await page.evaluate(() => {
      const t = document.querySelector('.info, #info, .book-info, h1');
      const a = document.querySelector('.info .small, .small a, .book-info a');
      return { title: t ? t.textContent.trim().slice(0, 40) : '', author: a ? a.textContent.trim().slice(0, 20) : '' };
    });
    console.log('网站书页标题/作者:', JSON.stringify(info));

    // 2) 打开真实网站章节页 6289/1，读页面正文
    await page.goto(`https://www.bqg713.cc/#/book/${BOOK_ID}/${CID}.html`, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));
    const pageTitle = await page.evaluate(() => {
      const t = document.querySelector('#title, h1');
      return t ? t.textContent.trim() : '';
    });
    const pageBody = await page.evaluate(() => {
      const c = document.querySelector('#chaptercontent');
      return c ? c.innerText.slice(0, 300) : '(无chaptercontent)';
    });
    console.log('网站章节页标题:', JSON.stringify(pageTitle));
    console.log('网站页面正文前300:', JSON.stringify(pageBody));
    console.log('网站页面标记:', tag(pageBody));

    // 3) 在同一个浏览器上下文里，用我们生成的 URL 抓
    const url = core.apiUrl('chapter', { id: BOOK_ID, chapterid: CID });
    console.log('我们生成的URL:', url);
    const ours = await page.evaluate(async (u) => {
      const r = await fetch(u);
      const d = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
      return { err: d.error || '', chaptername: d.chaptername, txt: (d.txt || '').slice(0, 300), len: (d.txt || '').length };
    }, url);
    console.log('我们接口返回: 章节名=' + JSON.stringify(ours.chaptername), 'len=' + ours.len);
    console.log('我们接口txt前300:', JSON.stringify(ours.txt));
    console.log('我们接口标记:', tag(ours.txt));
  } finally {
    await browser.close();
  }
})();
