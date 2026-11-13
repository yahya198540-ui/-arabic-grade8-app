const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?q=low&dtmax=0.1');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 }); await p.waitForTimeout(500);
  await p.evaluate(() => { document.getElementById('start').classList.add('hidden'); __game.win(); });
  await p.waitForTimeout(2500);
  const rots = [[0, 0, 0], [0, Math.PI, 0], [Math.PI / 2, 0, 0], [-Math.PI / 2, 0, 0], [0, Math.PI / 2, 0], [0, -Math.PI / 2, 0]];
  for (let i = 0; i < rots.length; i++) {
    await p.evaluate((r) => { const h = __game.player.headObj; h.userData.att.rot.setFromEuler(new (h.rotation.constructor)(...r)); }, rots[i]);
    await p.waitForTimeout(900); await p.screenshot({ path: `/tmp/h${i}.png`, clip: { x: 60, y: 330, width: 260, height: 260 } });
  }
  await b.close();
})();
