// 验证 lib/bq5 新增功能：搜索 + 下载计划 + 部分正文抓取
const bq5 = require('./lib/bq5');

(async () => {
  console.log('== 搜索 兽血沸腾 ==');
  const list = await bq5.searchBooks('兽血沸腾');
  console.log(JSON.stringify(list, null, 1));

  console.log('\n== 下载计划 ==');
  const book = await bq5.getBook(list[0].url);
  const { plan, missing } = bq5.buildDownloadPlan(book.chapters);
  console.log('书名:', book.title, book.author, ' 计划章节:', plan.length, ' 缺失:', JSON.stringify(missing));
  console.log('前5:', plan.slice(0, 5).map(p => `${p.num}:${p.title}${p.hrefs.length > 1 ? '(合' + p.hrefs.length + ')' : ''}`).join(' | '));
  console.log('末3:', plan.slice(-3).map(p => `${p.num}:${p.title}`).join(' | '));
  const merged = plan.filter(p => p.hrefs.length > 1);
  console.log('合并前后半的:', merged.map(p => p.title).join(' | ') || '(无)');

  console.log('\n== 抓正文（第1章 + 第100章 + 一个合并章） ==');
  const picks = [plan[0], plan.find(p => p.num === 100), ...merged.slice(0, 1)].filter(Boolean);
  const res = await bq5.fetchPlan(picks);
  res.forEach((r, i) => {
    const clean = (r.txt || '').replace(/\s+/g, '');
    console.log(`[${picks[i].num}] ${r.title}  长度=${clean.length}  开头=${JSON.stringify(clean.slice(0, 40))}  污染=${bq5.isDirty(r.txt)}`);
  });
  await require('./lib/core').closeBrowser();
})();
