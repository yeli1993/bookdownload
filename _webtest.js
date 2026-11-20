// 端到端测试 Web 接口（手动消费 SSE 流）
const base = 'http://localhost:5173';

async function consumeSSE(url, onMsg, timeout = 60000) {
  const res = await fetch(url);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const start = Date.now();
  while (true) {
    if (Date.now() - start > timeout) break;
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      const line = chunk.split('\n').find(l => l.startsWith('data:'));
      if (line) onMsg(JSON.parse(line.slice(5).trim()));
    }
  }
}

(async () => {
  // 启动小范围下载（万相之王 前3章）
  const r = await fetch(base + '/api/download', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 2530, range: [1, 3], concurrency: 3 })
  });
  const d = await r.json();
  console.log('[download] taskId:', d.taskId);

  await consumeSSE(`${base}/api/progress/${d.taskId}`, (p) => {
    console.log('[progress]', p.status, p.pct + '%', `[${p.done}/${p.total}]`, p.title);
    if (['done','error','cancelled'].includes(p.status)) process.exit(0);
  });

  // 兜底：查列表
  const lr = await fetch(base + '/api/downloads');
  const ld = await lr.json();
  console.log('[downloads]', JSON.stringify(ld.data.map(t=>({t:t.title,s:t.status,p:t.pct,done:t.done})), null, 0));
})().catch(e => { console.error('ERR', e); process.exit(1); });
