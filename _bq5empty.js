// 1) 重抓空章节确认是否限流 2) 检查8个缺失编号是否有其他写法
const bq5 = require('./lib/bq5');

const CN = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
function cnToNum2(str) {
  if (!str) return 0;
  if (!/[十百]/.test(str)) { let n = 0; for (const ch of str) if (CN[ch] !== undefined) n = n * 10 + CN[ch]; return n; }
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
  const am = t.match(/第(\d+)章/); if (am) return Number(am[1]);
  const cm = t.match(/第([零一二三四五六七八九十百]+)章/); return cm ? cnToNum2(cm[1]) : 0;
}

(async () => {
  const book = await bq5.getBook('https://www.biquge5.com/78_78365/');
  const chs = book.chapters;

  // 1) 重抓空章节（每条之间间隔）
  const emptyOnes = ['187456', '187472', '187471'].map(id => `https://www.biquge5.com/78_78365/${id}.html`);
  for (const u of emptyOnes) {
    await new Promise(r => setTimeout(r, 1500));
    const [r] = await bq5.fetchChapters([u]);
    const clean = bq5.cleanTxt(r.txt);
    console.log(`重抓 ${u.slice(-20)}: len=${clean.length} 开=${JSON.stringify(clean.replace(/\s+/g, '').slice(0, 40))}`);
  }

  // 2) 缺失编号是否有其他写法
  const missing = [57, 164, 184, 238, 376, 513, 514, 539];
  const cnDigits = { 0: '零', 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' };
  const toCn = n => String(n).split('').map(d => cnDigits[d]).join('');
  for (const n of missing) {
    const patterns = [toCn(n), ...['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'].map(x => '')].slice(0, 1);
    const hit = chs.filter(c => c.title.includes('第') && c.title.includes(patterns[0]));
    console.log(`缺失 ${n} (写法"第${patterns[0]}章"): 相似条目 ${hit.length ? hit.map(h => h.title).slice(0, 5).join(' | ') : '无'}`);
  }
  await coreClose();
})();
async function coreClose() { require('./lib/core').closeBrowser(); }
