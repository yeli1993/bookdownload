const core = require('./lib/core');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼|李洛|大夏国/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  // 1) 书信息 API
  try {
    const info = await core.getBookInfo(6289);
    console.log('6289 book API: title=', info.title, '| author=', info.author, '| lastchapterid=', info.lastchapterid, '| 章节数=', info.count);
  } catch (e) { console.log('book API err:', e.message.slice(0, 80)); }

  // 2) 搜索同名书籍确认 ID 对应
  try {
    const res = await core.searchBooks('兽血沸腾');
    console.log('搜索「兽血沸腾」:', res.map(b => ({ id: b.id, title: b.title })).slice(0, 5));
  } catch (e) { console.log('search err:', e.message.slice(0, 80)); }

  // 3) 用真实浏览器打开 booklist 接口，看章节名与数量
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN'],
  });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    await page.goto(core.SITE, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    const blUrl = core.apiUrl('booklist', { id: 6289 });
    const bl = await page.evaluate(async (u) => {
      const r = await fetch(u);
      return r.ok ? await r.json() : { error: 'HTTP ' + r.status };
    }, blUrl);
    const list = Array.isArray(bl.list) ? bl.list : [];
    console.log('booklist 章节数:', list.length);
    console.log('前5章:', list.slice(0, 5).map(x => x.name || x.chaptername).join(' | '));
    console.log('第55-62章:', list.slice(54, 62).map((x, i) => `${54 + i + 1}:${x.name || x.chaptername}`).join(' | '));
    console.log('第98-102章:', list.slice(97, 102).map((x, i) => `${98 + i}:${x.name || x.chaptername}`).join(' | '));
  } finally {
    await browser.close();
  }
})();
