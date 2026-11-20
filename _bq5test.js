// 测试 lib/bq5.js：getBook + 排序 + 缺失 + fetchChapters 内容
const bq5 = require('./lib/bq5');

(async () => {
  const url = 'https://www.biquge5.com/78_78365/';
  const book = await bq5.getBook(url);
  console.log('书名:', book.title, '| 作者:', book.author);
  console.log('章节总数:', book.chapters.length);

  const sorted = bq5.sortChapters(book.chapters);
  console.log('排序后前8章:', sorted.slice(0, 8).map(c => `${bq5.parseChNum(c.title)}:${c.title.slice(0, 20)}`));
  console.log('排序后95-105章:', sorted.slice(94, 105).map(c => `${bq5.parseChNum(c.title)}:${c.title.slice(0, 20)}`));
  const numbered = sorted.filter(c => bq5.parseChNum(c.title) > 0);
  console.log('有编号章节:', numbered.length, ' 最大编号:', bq5.parseChNum(numbered[numbered.length - 1].title));
  console.log('最后5个编号:', numbered.slice(-5).map(c => `${bq5.parseChNum(c.title)}:${c.title.slice(0, 20)}`));
  console.log('番外/无编号章节数:', sorted.length - numbered.length);
  const extras = sorted.filter(c => bq5.parseChNum(c.title) === 0).slice(0, 12).map(c => c.title.slice(0, 24));
  console.log('番外示例:', extras);
  console.log('缺失章节:', bq5.missingChapters(book.chapters));

  // 抓取正文：首章、中间章、末章、一个番外
  const picks = [sorted[0], numbered[5], numbered[100], numbered[numbered.length - 1], sorted[sorted.length - 1]];
  const hrefs = picks.map(c => c.href);
  const res = await bq5.fetchChapters(hrefs);
  res.forEach((r, i) => {
    const clean = bq5.cleanTxt(r.txt);
    console.log(`\n[${i}] ${picks[i].title}`);
    console.log(`  错误=${r.error || '无'}  干净长度=${clean.length}  污染=${bq5.isDirty(clean)}`);
    console.log('  前60:', JSON.stringify(clean.replace(/\s+/g, '').slice(0, 60)));
    console.log('  末40:', JSON.stringify(clean.replace(/\s+/g, '').slice(-40)));
  });
  await coreClose();
})();

async function coreClose() {
  const core = require('./lib/core');
  await core.closeBrowser();
}
