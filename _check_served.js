(async () => {
  const html = await (await fetch('http://localhost:5173/')).text();
  const lines = html.split('\n');
  console.log('TOTAL LINES:', lines.length);
  lines.forEach((l, i) => {
    if (l.includes('function showView')) console.log('showView at line', i + 1);
    if (l.includes('getElementById(id)')) console.log('getElementById at line', i + 1);
    if (l.includes('classList.toggle')) console.log('classList.toggle at line', i + 1);
    if (l.includes('id="viewReader"')) console.log('viewReader at line', i + 1);
    if (l.includes('id="viewHome"')) console.log('viewHome at line', i + 1);
    if (l.includes('id="viewDetail"')) console.log('viewDetail at line', i + 1);
    if (l.includes('openReader')) console.log('openReader ref at line', i + 1);
    if (l.includes("action === 'start'")) console.log("action start at line", i + 1);
  });
})();
