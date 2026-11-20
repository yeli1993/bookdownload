// 输出前 120 条章节（按 href 排序），看开头合并规律
const bq5 = require('./lib/bq5');

(async () => {
  const book = await bq5.getBook('https://www.biquge5.com/78_78365/');
  const chs = book.chapters;
  console.log('总数:', chs.length, ' 标题:', book.title, ' 作者:', book.author);
  const sorted = chs.slice().sort((a, b) => {
    const ia = Number(a.href.split('/').pop().replace('.html', ''));
    const ib = Number(b.href.split('/').pop().replace('.html', ''));
    return ia - ib;
  });
  sorted.slice(0, 120).forEach((c, i) => {
    const id = Number(c.href.split('/').pop().replace('.html', ''));
    console.log(`${i + 1}. ${id} ${c.title.slice(0, 34)}`);
  });
  await require('./lib/core').closeBrowser();
})();
