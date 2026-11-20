// 分析 biquge5 兽血沸腾目录：编号分布、上下半章情况、重复情况
const bq5 = require('./lib/bq5');

(async () => {
  const book = await bq5.getBook('https://www.biquge5.com/78_78365/');
  const chs = book.chapters;
  console.log('目录条目总数:', chs.length);
  const byNum = new Map();
  for (const c of chs) {
    if (bq5.isPromo(c.title)) continue;
    const n = bq5.parseChNum(c.title);
    if (!n) continue;
    if (!byNum.has(n)) byNum.set(n, []);
    byNum.get(n).push(c.title);
  }
  let dupCount = 0, halfCount = 0;
  const halves = [];
  for (const [n, arr] of byNum) {
    if (arr.length > 1) dupCount++;
    const halfish = arr.filter(t => /[上中下]|[（({【\[｛][上中下]/.test(t.replace(/^第\d+章\s*/, '').slice(0, 3)));
    if (halfish.length) { halfCount++; halves.push([n, arr.slice(0, 4)]); }
  }
  console.log('编号数:', byNum.size, ' 有重复的编号数:', dupCount, ' 含上下半章的编号数:', halfCount);
  console.log('上下半示例:');
  halves.slice(0, 8).forEach(([n, arr]) => console.log(`  ${n}: ${arr.map(t => t.slice(0, 30)).join(' | ')}`));
  await require('./lib/core').closeBrowser();
})();
