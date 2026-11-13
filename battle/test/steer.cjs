const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?q=low&dtmax=0.3'); await p.waitForTimeout(1200);
  await p.evaluate(() => document.getElementById('start').classList.add('hidden'));
  for (const [n, key] of [[0, 'ArrowLeft'], [1, 'ArrowRight'], [2, 'KeyA'], [3, 'KeyD'], [4, 'ArrowLeft'], [5, 'ArrowRight']]) {
    await p.evaluate((n) => __game.jump(n), n); await p.keyboard.down(key);
    let mode, t0 = Date.now(), maxOff = 0;
    while (Date.now() - t0 < 120000) { const s = await p.evaluate(() => ({ m: __game.S.mode, off: __game.S.off })); mode = s.m; maxOff = Math.max(maxOff, Math.abs(s.off)); if (mode !== 'walk') break; await p.waitForTimeout(150); }
    await p.keyboard.up(key);
    const d = await p.evaluate((n) => { const P = __game.E[n].P, q = __game.player.group.position; return Math.hypot(P.x - q.x, P.z - q.z); }, n);
    console.log('enc', n + 1, key, 'mode', mode, 'maxOff', maxOff.toFixed(1), 'distToP', d.toFixed(2), 'secs', ((Date.now() - t0) / 1000) | 0);
  }
  console.log('ERR', errs); await b.close();
})();
