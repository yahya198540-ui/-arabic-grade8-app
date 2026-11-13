const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = '/tmp/f'; fs.mkdirSync(OUT, { recursive: true }); const ENC = +process.env.ENC || 1;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html') + '?q=high&dtmax=0.1'); await p.waitForTimeout(1200);
  await p.evaluate(() => document.getElementById('start').classList.add('hidden'));
  await p.evaluate((n) => __game.jump(n), ENC);
  while ((await p.evaluate(() => __game.S.mode)) !== 'question') await p.waitForTimeout(200);
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/1_q.png' });
  const c = await p.evaluate(() => __game.S.enc !== undefined && __game.QUESTIONS[__game.S.enc].correct);
  await p.click(`.ans[data-i="${c}"]`);
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(900); await p.screenshot({ path: OUT + `/2_s${i}.png` }); }
  console.log('ERR', errs, await p.evaluate(() => __game.S.mode)); await b.close();
})();
