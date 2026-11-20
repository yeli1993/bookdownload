const core = require('./lib/core');

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  // 同一章节(100)多次抓取，判断污染是稳定的还是动态的
  for (let round = 1; round <= 3; round++) {
    const urls = [
      core.apiUrl('chapter', { id: 6289, chapterid: 100 }),
      core.apiUrl('chapter', { id: 6289, chapterid: 60 }),
      core.apiUrl('chapter', { id: 6289, chapterid: 55 }),
      core.apiUrl('chapter', { id: 6289, chapterid: 51 }),
    ];
    const results = await core.fetchChaptersViaBrowser(urls);
    results.forEach((ch, i) => {
      const cid = [100, 60, 55, 51][i];
      const t = ch.error ? 'ERR(' + ch.error + ')' : tag(ch.txt);
      console.log(`第${round}轮 章${cid}: ${t}  名称=${JSON.stringify(ch.chaptername)} 前缀=${JSON.stringify((ch.txt||'').slice(0,14))}`);
    });
    await core.sleep(1500);
  }
  await core.closeBrowser();
})();
