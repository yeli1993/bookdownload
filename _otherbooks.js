const core = require('./lib/core');

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼|李洛|大夏国|古仙医|苏辰/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  // 其他书籍的深章是否也污染
  const cases = [
    [2530, 1, '万相之王/1'],
    [2530, 100, '万相之王/100'],
    [2530, 500, '万相之王/500'],
    [2185, 1, '都市古仙医/1'],
    [2185, 100, '都市古仙医/100'],
    [2185, 300, '都市古仙医/300'],
  ];
  const urls = cases.map(c => core.apiUrl('chapter', { id: c[0], chapterid: c[1] }));
  const results = await core.fetchChaptersViaBrowser(urls);
  results.forEach((ch, i) => {
    const [id, cid, label] = cases[i];
    const t = ch.error ? 'ERR(' + ch.error + ')' : tag(ch.txt);
    console.log(`${label}: ${t}  名称=${JSON.stringify(ch.chaptername)} 前缀=${JSON.stringify((ch.txt||'').slice(0,16))}`);
  });
  await core.closeBrowser();
})();
