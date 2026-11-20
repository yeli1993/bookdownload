// 检查 bq5 同编号多版本章节 + 阿拉伯数字编号章节
const bq5 = require('./lib/bq5');

(async () => {
  const book = await bq5.getBook('https://www.biquge5.com/78_78365/');
  const chs = book.chapters;
  console.log('总数:', chs.length);

  // 1) 阿拉伯数字编号章节
  const arabic = chs.filter(c => /^第\d+章/.test(c.title));
  console.log('\n阿拉伯数字编号章节:', arabic.length);
  arabic.slice(0, 20).forEach(c => console.log('  ', c.title.slice(0, 30)));

  // 2) 中文编号但被解析为0的（编号写法特殊）
  const weird = chs.filter(c => /^第[零一二三四五六七八九十百]+章/.test(c.title));
  console.log('\n中文编号章节数:', weird.length, ' 解析为0的:', weird.filter(c => bq5.parseChNum(c.title) === 0).map(c => c.title).slice(0, 10));

  // 3) 同编号多版本
  const groups = new Map();
  for (const c of chs) {
    const n = bq5.parseChNum(c.title);
    if (n > 0) { if (!groups.has(n)) groups.set(n, []); groups.get(n).push(c.title); }
  }
  const dups = [...groups.entries()].filter(([n, arr]) => arr.length > 1);
  console.log('\n存在多版本的编号数:', dups.length);
  dups.slice(0, 15).forEach(([n, arr]) => console.log(`  编号${n}:`, arr.join(' | ').slice(0, 90)));

  // 4) 用阿拉伯数字解析后的缺失
  function parseAll(t) {
    const am = t.match(/第(\d+)章/);
    if (am) return Number(am[1]);
    return bq5.parseChNum(t);
  }
  const nums = chs.map(c => parseAll(c.title)).filter(n => n > 0);
  const max = Math.max(...nums);
  const set = new Set(nums);
  const missing = [];
  for (let i = 1; i <= max; i++) if (!set.has(i)) missing.push(i);
  console.log('\n最大编号:', max, ' 去重编号数:', set.size, ' 缺失:', JSON.stringify(missing));

  // 5) 重复组是否有同编号同标题（真重复）
  const sameTitleDup = new Map();
  for (const c of chs) {
    const k = c.title + '@' + bq5.parseChNum(c.title);
    sameTitleDup.set(k, (sameTitleDup.get(k) || 0) + 1);
  }
  const realDup = [...sameTitleDup.entries()].filter(([k, v]) => v > 1);
  console.log('\n同编号同标题的重复条目:', realDup.length);
  realDup.slice(0, 10).forEach(([k, v]) => console.log('  ', k, 'x', v));
  await coreClose();
})();
async function coreClose() { require('./lib/core').closeBrowser(); }
