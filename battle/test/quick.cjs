const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || '/tmp/q'; fs.mkdirSync(OUT, { recursive: true });
const W = +process.env.W || 1280, H = +process.env.H || 720; const encs = (process.env.ENCS || '0,1,2,3,4,5').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?q=high&dtmax=0.3'); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.getElementById('start').classList.add('hidden'); });
  for (const n of encs) {
    if (n === 9) { await p.evaluate(() => __game.win()); await p.waitForTimeout(6000); await p.screenshot({ path: OUT + '/win.png' }); continue; }
    await p.evaluate((n) => __game.jump(n), n);
    const t0 = Date.now(); while (Date.now() - t0 < 90000 && (await p.evaluate(() => __game.S.mode)) !== 'question') await p.waitForTimeout(200);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: OUT + `/e${n + 1}.png` });
  }
  console.log('ERR', errs); await b.close();
})();
