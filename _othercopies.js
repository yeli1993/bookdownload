const core = require('./lib/core');

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼|雄鹿|比蒙/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  const cases = [
    [123437, 1, '123437/1'],
    [123437, 100, '123437/100'],
    [123437, 500, '123437/500'],
    [117702, 1, '117702/1'],
    [117702, 100, '117702/100'],
    [117702, 500, '117702/500'],
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
