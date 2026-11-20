// 验证阅读接口底层：getBook 详情字段 + buildReadingList + fetchChapter
const bq5 = require('./lib/bq5');

(async () => {
  const book = await bq5.getBook('https://www.biquge5.com/78_78365/');
  console.log('书名:', book.title, ' 作者:', book.author, ' 状态:', book.status, ' 更新:', book.lastUpdate);
  console.log('封面:', book.cover);
  console.log('简介:', (book.intro || '').slice(0, 80) + '...');
  const list = bq5.buildReadingList(book.chapters);
  console.log('阅读目录条数:', list.length);
  console.log('首3章:', list.slice(0, 3).map(c => `${c.num}:${c.title.slice(0, 24)}`).join(' | '));
  console.log('末2章:', list.slice(-2).map(c => `${c.num}:${c.title.slice(0, 24)}`).join(' | '));
  const ch = await bq5.fetchChapter([list[0].hrefs[0]]);
  console.log('章节标题:', ch.title, ' 长度:', ch.txt.length, ' 错误:', ch.error || '无');
  console.log('正文前120字:', ch.txt.replace(/\s+/g, ' ').slice(0, 120));
  await require('./lib/core').closeBrowser();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
