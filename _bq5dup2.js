// 1) 改进解析后重新统计 2) 列出全部重复组 3) 抓取第一章各版本对比
const bq5 = require('./lib/bq5');

// 改进解析：阿拉伯数字 + 中文标准 + 数字拼接
const CN = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
function cnToNum2(str) {
  if (!str) return 0;
  if (!/[十百]/.test(str)) {
    let n = 0;
    for (const ch of str) if (CN[ch] !== undefined) n = n * 10 + CN[ch];
    return n;
  }
  let total = 0, num = 0;
  for (const ch of str) {
    if (CN[ch] !== undefined) num = CN[ch];
    else if (ch === '十') { total += (num || 1) * 10; num = 0; }
    else if (ch === '百') { total += (num || 1) * 100; num = 0; }
  }
  return total + num;
}
function parseAll(t) {
  if (!t) return 0;
  const am = t.match(/第(\d+)章/);
  if (am) return Number(am[1]);
  const cm = t.match(/第([零一二三四五六七八九十百]+)章/);
  return cm ? cnToNum2(cm[1]) : 0;
}

(async () => {
  const book = await bq5.getBook('https://www.biquge5.com/78_78365/');
  const chs = book.chapters;
  chs.forEach(c => c.num = parseAll(c.title));

  const nums = chs.map(c => c.num).filter(n => n > 0);
  const max = Math.max(...nums);
  const set = new Set(nums);
  const missing = [];
  for (let i = 1; i <= max; i++) if (!set.has(i)) missing.push(i);
  console.log('总数:', chs.length, ' 有编号:', nums.length, ' 最大:', max, ' 唯一编号:', set.size, ' 缺失:', JSON.stringify(missing));

  // 全部重复组
  const groups = new Map();
  for (const c of chs) if (c.num > 0) { if (!groups.has(c.num)) groups.set(c.num, []); groups.get(c.num).push(c); }
  const dups = [...groups.entries()].filter(([n, arr]) => arr.length > 1);
  console.log('\n全部重复组（' + dups.length + '）:');
  dups.forEach(([n, arr]) => console.log(`  ${n}:`, arr.map(c => c.title).join(' | ').slice(0, 100)));

  // 抓第一章三个版本 + 第16章（唯一版本）对比
  const c1s = chs.filter(c => c.num === 1).slice(0, 3);
  const c16 = chs.find(c => c.num === 16);
  const picks = [...c1s, c16].map(c => c.href);
  const res = await bq5.fetchChapters(picks);
  res.forEach((r, i) => {
    const t = picks[i];
    const c = c1s.concat([c16])[i];
    const clean = bq5.cleanTxt(r.txt);
    console.log(`\n=== ${c.title} (${t}) ===`);
    console.log('开:', JSON.stringify(clean.replace(/\s+/g, '').slice(0, 70)));
  });
  await coreClose();
})();
async function coreClose() { require('./lib/core').closeBrowser(); }
