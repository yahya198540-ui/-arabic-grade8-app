/* اختبار شامل: يشغّل اللعبة من الشاشة الافتتاحية حتى شاشة الانتصار ويلتقط صورًا */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const W = +process.env.W || 1280, H = +process.env.H || 720;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?q=high&dtmax=0.25');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 }); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/00_menu.png' });
  await p.click('#goBtn', { force: true });
  const mode = () => p.evaluate(() => window.__game.S.mode);
  const waitMode = async (m, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await mode()) === m) return true; await p.waitForTimeout(150); } throw new Error('timeout waiting ' + m + ' now ' + await mode()); };
  const wrongPick = [0, 0, 2, 1, 0, 1]; // خيار خاطئ لكل سؤال (للمواجهات التي نختبر فيها الخطأ)
  const results = [];
  for (let i = 0; i < 6; i++) {
    await p.waitForFunction(() => window.__game, null, { timeout: 60000 }); await p.waitForTimeout(500); if (i === 0) await p.screenshot({ path: OUT + '/01_walk.png' });
    await waitMode('question');
    await p.waitForTimeout(500);
    const info = await p.evaluate(() => ({ q: document.getElementById('qtext').textContent, opts: [...document.querySelectorAll('.ans .t')].map(e => e.textContent), enc: document.getElementById('chEnc').textContent, stu: document.getElementById('chStu').textContent }));
    const Q = await p.evaluate((i) => window.__game.QUESTIONS[i], i);
    if (info.q !== Q.q || JSON.stringify(info.opts) !== JSON.stringify(Q.options)) throw new Error('mismatch q' + i);
    await p.screenshot({ path: OUT + `/q${i + 1}_a_question.png` });
    if (i % 2 === 0 || i === 5) { // خطأ ثم تصحيح
      await p.click(`.ans[data-i="${Q.correct === wrongPick[i] ? (wrongPick[i] + 1) % 4 : wrongPick[i]}"]`);
      await p.waitForTimeout(300); await p.screenshot({ path: OUT + `/q${i + 1}_b_wrong.png` });
      results.push({ i, afterWrong: await p.evaluate(() => ({ fb: document.getElementById('fbt').textContent, mode: window.__game.S.mode, energy: window.__game.S.energy })) });
    }
    await p.click(`.ans[data-i="${Q.correct}"]`);
    await p.waitForTimeout(900); await p.screenshot({ path: OUT + `/q${i + 1}_c_shot.png` });
    await waitMode('between');
    await p.waitForTimeout(400); await p.screenshot({ path: OUT + `/q${i + 1}_d_done.png` });
    results.push({ i, done: await p.evaluate(() => ({ fb: document.getElementById('fbt').textContent, score: document.getElementById('score').textContent })) });
    await p.click('#nextBtn', { force: true });
    if (i === 5) await waitMode('victory');
  }
  await p.waitForTimeout(3500); await p.screenshot({ path: OUT + '/zz_win.png' });
  const win = await p.evaluate(() => ({ s: document.getElementById('wScore').textContent, f: document.getElementById('wFirst').textContent, d: document.getElementById('wDone').textContent }));
  win.opac = await p.evaluate(() => ({ win: getComputedStyle(document.getElementById('win')).opacity, panel: getComputedStyle(document.getElementById('panel')).opacity, h2: document.querySelector('#win h2').textContent, credit: document.getElementById('wcredit').textContent, startCredit: document.querySelector('#start .by').textContent }));
  console.log(JSON.stringify(results, null, 1)); console.log('WIN', JSON.stringify(win)); console.log('ERRORS', errs);
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
