const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?q=low&dtmax=0.3'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 }); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const { E, world } = __game, out = [];
    const segD = (a, b, c) => { const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.z - a.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(a.x + dx * t - c.x, a.z + dz * t - c.z); };
    E.forEach((e, i) => {
      let minClear = 99, who = null;
      for (let k = 0; k < e.route.length - 1; k++) for (const c of world.colliders) { const d = segD(e.route[k], e.route[k + 1], c) - c.r; if (d < minClear) { minClear = d; who = [c.x, c.z]; } }
      const pts = { P: e.P, R: e.R }; const pc = {};
      for (const [n, v] of Object.entries(pts)) { let m = 99; for (const c of world.colliders) m = Math.min(m, Math.hypot(v.x - c.x, v.z - c.z) - c.r); pc[n] = +m.toFixed(1); }
      out.push({ enc: i + 1, routeClear: +minClear.toFixed(1), who, pc });
    });
    return out;
  });
  console.log(JSON.stringify(r)); await b.close();
})();
