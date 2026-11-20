// 检查 bq5 第100章文本命中哪个污染特征（判断误报）
const bq5 = require('./lib/bq5');
const DIRTY = /搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw/;

(async () => {
  const book = await bq5.getBook('https://www.biquge5.com/78_78365/');
  const { plan } = bq5.buildDownloadPlan(book.chapters);
  const p = plan.find(x => x.num === 100);
  const res = await bq5.fetchPlan([p]);
  const txt = res[0].txt || '';
  const matches = [...new Set((txt.match(new RegExp('(搜索素人视频|⊕|aaxs8|shw5|srsp|biquie|阿拉伯语专业|我今年２２岁|素人|22xsw)', 'g')) || []))];
  console.log('命中特征:', matches);
  for (const mk of matches) {
    const i = txt.indexOf(mk);
    console.log(`  [${mk}] 上下文: ...${txt.slice(Math.max(0, i - 25), i + 25).replace(/\s+/g, ' ')}...`);
  }
  await require('./lib/core').closeBrowser();
})();
