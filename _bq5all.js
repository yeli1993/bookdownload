// 用 lib/bq5 getBook 收集全部章节，按 href 排序输出，看合并规律
const bq5 = require('./lib/bq5');

(async () => {
  const book = await bq5.getBook('https://www.biquge5.com/78_78365/');
  const chs = book.chapters;
  console.log('总数:', chs.length, ' 标题:', book.title, ' 作者:', book.author);
  // 按 id 排序
  const sorted = chs.slice().sort((a, b) => {
    const ia = Number(a.href.split('/').pop().replace('.html', ''));
    const ib = Number(b.href.split('/').pop().replace('.html', ''));
    return ia - ib;
  });
  // 打印 ID 跳变点（前后 id 差距 > 2 或标题编号体系变化）
  let prevId = 0;
  sorted.forEach((c, i) => {
    const id = Number(c.href.split('/').pop().replace('.html', ''));
    const jump = i > 0 && id - prevId > 2 ? `  <-- 跳变(+${id - prevId})` : '';
    prevId = id;
    console.log(`${i + 1}. ${id} ${c.title.slice(0, 30)}${jump}`);
