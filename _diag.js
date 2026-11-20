const core = require('./lib/core');
const https = require('https');
const http = require('http');

function hreq(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.get(u, { headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

(async () => {
  const sb = core.loadJS();
  const base = core.apiUrl('chapter', { id: 2530, chapterid: 1 });
  console.log('URL:', base);

  const show = (label, r) => {
    try {
      const d = JSON.parse(r.body);
      const txt = d.txt || '';
      console.log(`[${label}] status:${r.status} len:${txt.length} 前缀:${JSON.stringify(txt.slice(0, 30))} cache:${r.headers['cf-cache-status']}`);
    } catch {
      console.log(`[${label}] 非JSON status:${r.status} body:${r.body.slice(0, 80)}`);
    }
  };

  // 1. https 模块，默认头
  try { show('https模块', await hreq(base, { 'User-Agent': core.UA })); } catch (e) { console.log('[https模块] err:', e.message.slice(0, 60)); }

  // 2. https 模块，完整浏览器头 + 时间戳
  try {
    show('https模块完整头', await hreq(base + '&_=' + Date.now(), {
      'User-Agent': core.UA,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': 'https://www.bqg713.cc/#/book/2530/',
      'Origin': 'https://www.bqg713.cc',
    }));
  } catch (e) { console.log('[https模块完整头] err:', e.message.slice(0, 60)); }

  // 3. https 模块，不带 Referer
  try { show('https模块无Referer', await hreq(base + '&_=' + Date.now(), { 'User-Agent': core.UA })); } catch (e) { console.log('[https模块无Referer] err:', e.message.slice(0, 60)); }
})();
