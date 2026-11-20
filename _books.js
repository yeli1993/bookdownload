const core = require('./lib/core');

function tag(txt) {
  if (/搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/.test(txt || '')) return '污染';
  if (/刘震撼|黑色的夜|魔族|勇斗魔狼/.test(txt || '')) return '干净';
  return '未知';
}

(async () => {
  for (const id of [6289, 123437, 117702]) {
    try {
      const info = await core.getBookInfo(id);
      console.log(`ID=${id}: title=${info.title} author=${info.author} lastchapterid=${info.lastchapterid} count=${info.count}`);
    } catch (e) { console.log(`ID=${id}: book err ${e.message.slice(0, 60)}`); }
  }
  await core.closeBrowser();
})();
