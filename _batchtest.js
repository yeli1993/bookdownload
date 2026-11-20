const core = require('./lib/core');

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|成人/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  const cids = [1, 2, 3, 4, 5, 10, 20, 50, 100, 200, 400, 700, 789, 790];
  const urls = cids.map(c => core.apiUrl('chapter', { id: 6289, chapterid: c }));
  // 复用 server 的批量抓取方式
  const results = await core.fetchChaptersViaBrowser(urls);
  let clean = 0, polluted = 0, err = 0;
  results.forEach((ch, i) => {
    if (ch && ch.error) { err++; console.log(`章${cids[i]}: ERR ${ch.error}`); return; }
    const t = tag(ch.txt);
    if (t === '污染') polluted++;
    if (t === '干净') clean++;
    console.log(`章${cids[i]}: ${t}  章节名=${JSON.stringify(ch.chaptername)} 前缀=${JSON.stringify((ch.txt||'').slice(0,16))}`);
  });
  console.log(`\n总结: 干净=${clean} 污染=${polluted} 错误=${err}`);
  await core.closeBrowser();
})();
