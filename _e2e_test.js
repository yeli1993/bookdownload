/**
 * 端到端验证 v2：正确匹配《兽血沸腾》，测试 搜索→详情→阅读→翻章→目录→设置
 */
'use strict';
const fs = require('fs');
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const exe = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh-CN', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => errs.push('[pageerror] ' + (e.stack || e.message || e)));
  page.on('requestfailed', r => { if (r.url().includes('5173')) errs.push('[reqfail] ' + r.url()); });
  page.on('response', r => { if (r.status() >= 400) errs.push('[http' + r.status() + '] ' + r.url()); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = (...a) => console.log('*', ...a);

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await sleep(1500);

    // 1. 搜索（biquge5）
    await page.evaluate(() => { document.getElementById('source').value = 'biquge5'; document.getElementById('q').value = '兽血沸腾'; triggerSearch(); });
    await sleep(6000);
    const r1 = await page.evaluate(() => ({
      cards: [...document.querySelectorAll('#results .card')].map(c => (c.querySelector('.t') || {}).textContent || ''),
    }));
    log('搜索结果:', JSON.stringify(r1.cards));

    // 2. 点击标题恰为《兽血沸腾》的在线阅读
    const picked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('#results [data-action="read"]')]
        .find(b => { const t = (b.closest('.card').querySelector('.t') || {}).textContent || ''; return t.trim() === '兽血沸腾'; });
      if (!btn) return 'NO_BTN';
      const url = btn.getAttribute('data-url');
      btn.click();
      return url;
    });
    log('点击《兽血沸腾》: %s', picked);
    await sleep(12000); // 78_78365 约 5-6s

    const r2 = await page.evaluate(() => ({
      active: [...document.querySelectorAll('.view.active')].map(v => v.id),
      detailLen: document.getElementById('detailBody').innerHTML.length,
      title: (document.querySelector('#detailBody h1') || {}).textContent || '',
      catCount: document.querySelectorAll('#detailCatalog .cat-item').length,
      hasStart: !!document.querySelector('#detailBody [data-action="start"]'),
      hasResume: !!document.querySelector('#detailBody [data-action="resume"]'),
    }));
    log('详情 active=%s title=%s catCount=%s start=%s resume=%s len=%s', JSON.stringify(r2.active), r2.title, r2.catCount, r2.hasStart, r2.hasResume, r2.detailLen);

    // 3. 开始阅读
    const r3 = await page.evaluate(() => {
      const el = document.querySelector('#detailBody [data-action="start"], #detailBody [data-action="resume"]');
      if (!el) return 'NO_BTN';
      el.click();
      return 'CLICKED:' + el.getAttribute('data-action');
    });
    log('点击阅读: %s', r3);
    await sleep(8000);
    const r4 = await page.evaluate(() => ({
      active: [...document.querySelectorAll('.view.active')].map(v => v.id),
      ch: document.getElementById('rbCh').textContent,
      contentLen: document.getElementById('readerContent').innerHTML.length,
      paraCount: document.querySelectorAll('#readerContent p').length,
      head: document.getElementById('readerContent').innerText.slice(0, 50).replace(/\n/g, ' '),
      prevDisabled: document.getElementById('rbPrev').disabled,
    }));
    log('阅读器 active=%s 章=%s 段落=%s len=%s prevDisabled=%s head=%s', JSON.stringify(r4.active), r4.ch, r4.paraCount, r4.contentLen, r4.prevDisabled, r4.head);

    // 4. 下一章
    await page.evaluate(() => document.getElementById('rbNext').click());
    await sleep(8000);
    const r5 = await page.evaluate(() => ({
      ch: document.getElementById('rbCh').textContent,
      paraCount: document.querySelectorAll('#readerContent p').length,
      head: document.getElementById('readerContent').innerText.slice(0, 50).replace(/\n/g, ' '),
    }));
    log('第二章 章=%s 段落=%s head=%s', r5.ch, r5.paraCount, r5.head);

    // 5. 目录抽屉
    await page.evaluate(() => document.getElementById('rbCatalog').click());
    await sleep(1500);
    const r6 = await page.evaluate(() => ({
      drawerOpen: document.getElementById('catalogDrawer').classList.contains('open'),
      catItems: document.querySelectorAll('#catalogList .rc').length,
      curIdx: (document.querySelector('#catalogList .rc.cur') || {}).dataset ? document.querySelector('#catalogList .rc.cur').dataset.idx : null,
    }));
    log('目录抽屉 open=%s 项数=%s cur=%s', r6.drawerOpen, r6.catItems, r6.curIdx);
    await page.evaluate(() => { document.getElementById('drawerMask').click(); });

    // 6. 设置抽屉 + 夜间模式
    await page.evaluate(() => document.getElementById('rbSettings').click());
    await sleep(800);
    await page.evaluate(() => {
      const d = document.querySelector('[data-theme="dark"]');
      if (d) d.click();
    });
    await sleep(500);
    const r7 = await page.evaluate(() => ({
      readerClass: document.getElementById('viewReader').className,
      drawerOpen: document.getElementById('settingsDrawer').classList.contains('open'),
    }));
    log('设置: readerClass=%s settingsDrawer=%s', r7.readerClass, r7.drawerOpen);

    // 7. 返回详情 → 继续阅读（验证进度记忆）
    await page.evaluate(() => document.getElementById('rbBack').click());
    await sleep(1500);
    const r8 = await page.evaluate(() => ({
      active: [...document.querySelectorAll('.view.active')].map(v => v.id),
      resumeBtn: document.querySelector('#detailBody [data-action="resume"]') ? (document.querySelector('#detailBody [data-action="resume"]').textContent || '').slice(0, 30) : null,
      startBtn: !!document.querySelector('#detailBody [data-action="start"]'),
    }));
    log('返回详情 active=%s resume=%s start=%s', JSON.stringify(r8.active), r8.resumeBtn, r8.startBtn);

  } catch (e) {
    log('FATAL: %s', e.stack || e.message);
  }

  log('--- console 错误/警告 (%s) ---', errs.length);
  errs.forEach(e => log(e));
  await browser.close();
  process.exit(0);
})().catch(e => { console.error('E2E_FATAL', e); process.exit(1); });
