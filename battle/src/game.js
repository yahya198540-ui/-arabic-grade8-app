import * as THREE from 'three';
import { META, QUESTIONS, LETTERS } from './questions.js';
import * as A from './audio.js';
import * as T from './textures.js';
import { makePlayer, makeRobot, ROBOT_SPECS, MINION_SPECS } from './chars.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildWorld, ENC, SEP, collide } from './world.js';
import { Particles } from './particles.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const $ = (id) => document.getElementById(id);
const V3 = THREE.Vector3;
const params = new URLSearchParams(location.search);
const DTMAX = params.has('dtmax') ? +params.get('dtmax') : 0.05;
const AR = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

/* ====================== المشهد ====================== */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe4e2d2, 70, 380);
const camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 1200);
const hemi = new THREE.HemisphereLight(0xcfeaff, 0xd9bf86, 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d2, 2.6); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -26; sun.shadow.camera.right = sun.shadow.camera.top = 26; sun.shadow.camera.near = 1; sun.shadow.camera.far = 140; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
scene.add(new THREE.DirectionalLight(0x9fd0ff, 0.5).translateX(30).translateY(10).translateZ(-20));
const pmrem = new THREE.PMREMGenerator(renderer); const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const world = buildWorld(scene, 'high');
const player = makePlayer(); scene.add(player.group);
const robots = ROBOT_SPECS.map(s => { const r = makeRobot(s); r.group.visible = false; scene.add(r.group); return r; });
scene.traverse(o => { const ms = o.material ? [].concat(o.material) : []; ms.forEach(m => { if (m.metalness > 0.3) { m.envMap = envTex; m.envMapIntensity = 0.9; } }); });
const glowP = new Particles(scene, 900, T.glow('255,255,255'), true);
const starP = new Particles(scene, 300, T.star('#ffd84a'), true);
const confP = (() => { const c = document.createElement('canvas'); c.width = c.height = 8; c.getContext('2d').fillStyle = '#fff'; c.getContext('2d').fillRect(0, 0, 8, 8); return new Particles(scene, 500, new THREE.CanvasTexture(c), false); })();
const allP = [glowP, starP, confP];
// كرات الطاقة (ثلاث) + خطوط تتبّع + ضوء الفوهة
const balls = [0, 1, 2].map(() => { const b = new THREE.Group(); b.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 3, 2.6) })));
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('80,255,170'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); gl.scale.setScalar(2.8); b.add(gl); b.visible = false; scene.add(b); return b; });
const tracers = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 3, 2.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; scene.add(m); return m; });
const muzzleLight = new THREE.PointLight(0x7dffd0, 0, 14); scene.add(muzzleLight);
const minions = [MINION_SPECS[0], MINION_SPECS[1]].map(s => { const r = makeRobot(s); r.group.visible = false; r.spec = s; scene.add(r.group); return r; });
const NAMES = ['الروبوت الحارس', 'المسيّرة الزرقاء', 'الجندي الأخضر', 'الدبابة النارية', 'الفارس البنفسجي', 'الزعيم الذهبي'];

/* ====================== الحالة ====================== */
const E = ENC.map(e => {
  const f = new V3(e.f[0], 0, e.f[1]).normalize(), r = new V3(-f.z, 0, f.x), P = new V3(e.P[0], 0, e.P[1]);
  const R = P.clone().addScaledVector(r, SEP);
  return { f, r, P, R, spawn: R.clone().addScaledVector(r, 11), route: e.route.map(a => new V3(a[0], 0, a[1])) };
});
const START = E[0].route[0].clone();
const S = {
  baseFov: 48, speedNow: 0, shake: 0, minions: [], dustT: 0, fov: 56, radarT: 0,
  mode: 'menu', enc: 0, score: 0, firstTry: 0, energy: 1, attempts: 0, wp: [], legT: 0, spawned: false, t: 0, off: 0, winT: 0,
  robot: null, rState: 'none', seq: null, camBlend: 0, quality: params.get('q') === 'low' ? 'low' : 'high', fpsAcc: 0, fpsN: 0, autoQ: !params.has('q'), hintT: 0,
};
const pos = player.group.position, heading = { yaw: 0 };
pos.copy(START);
const keys = {};
const cp = new V3(), cl = new V3(); // كاميرا المتابعة المنعّمة
let camInit = false;

/* ====================== الواجهة ====================== */
function setEnc() { $('encT').textContent = `المواجهة ${AR(S.enc + 1)} من ${AR(6)}`; $('chEnc').textContent = `المواجهة ${AR(S.enc + 1)} من ${AR(6)}`; $('chStu').textContent = `دور الطالب رقم ${AR(S.enc + 1)}`; drawDots(); }
function drawDots() { $('dots').innerHTML = [0, 1, 2, 3, 4, 5].map(i => `<i class="${i < S.enc || (i === S.enc && S.mode === 'between') ? 'done' : i === S.enc ? 'cur' : ''}"></i>`).join(''); }
function setScore() { $('score').textContent = AR(S.score); $('scoreMax').textContent = 'من ' + AR(60); }
function setEnergy() { $('eFill').style.width = (S.energy * 100) + '%'; $('eFill').style.background = S.energy < 0.4 ? 'linear-gradient(180deg,#ffd37a,#f08a1c)' : ''; }
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2800); }
function flashScreen(c) { const f = $('flash'); f.className = ''; void f.offsetWidth; f.className = c; setTimeout(() => f.className = '', 120); }

function showQuestion() {
  const q = QUESTIONS[S.enc];
  $('qtext').textContent = q.q; $('qtext').style.fontSize = q.q.length > 60 ? 'calc(var(--u)*2.1)' : '';
  $('answers').innerHTML = q.options.map((o, i) => `<button class="ans" data-i="${i}"><span class="l">${LETTERS[i]}</span><span class="t${o.length > 14 ? ' lg' : ''}">${o}</span></button>`).join('');
  $('fb').className = 'empty'; $('fbt').firstChild.textContent = 'فكّر جيدًا، ثم اختر الإجابة الصحيحة'; $('fbt').lastChild.textContent = ''; $('nextBtn').classList.add('hidden');
  $('panel').classList.remove('off'); S.mode = 'question'; S.attempts = 0; S.hintT = 99; $('hint').style.opacity = 0;
}
$('answers').addEventListener('click', (e) => { const b = e.target.closest('.ans'); if (b && !b.disabled) choose(+b.dataset.i, b); });

function choose(i, btn) {
  if (S.mode !== 'question') return;
  A.init();
  const q = QUESTIONS[S.enc];
  if (i === q.correct) {
    S.mode = 'defeat';
    const pts = S.attempts === 0 ? META.pointsFirst : META.pointsRetry;
    if (S.attempts === 0) S.firstTry++;
    S.score += pts; setScore();
    document.querySelectorAll('.ans').forEach(b => b.disabled = true); btn.classList.add('ok');
    $('fb').className = 'good'; $('fbt').firstChild.textContent = 'إجابة صحيحة! أحسنت'; $('fbt').lastChild.textContent = q.feedback;
    const p = $('pop'); p.textContent = '+' + AR(pts); p.classList.remove('go'); void p.offsetWidth; p.classList.add('go');
    A.sfx.correct(); flashScreen('g');
    S.seq = { t: 0, shots: null, done: false };
    // ضوء أخضر على المنصة
    glowP.burst(player.group.position.clone().setY(1), 30, 0x6dffb0, 5, 0.9, 0.9, 0, 2);
  } else {
    S.attempts++; btn.classList.add('no'); btn.disabled = true;
    $('fb').className = 'bad'; $('fbt').firstChild.textContent = 'حاول مرة أخرى'; $('fbt').lastChild.textContent = '';
    S.energy = Math.max(0.15, S.energy - 0.1); setEnergy();
    A.sfx.wrong(); A.sfx.hurt(); flashScreen('r');
    const pn = $('panel'); pn.classList.remove('shake'); void pn.offsetWidth; pn.classList.add('shake');
    player.hurt = 1;
    const r = S.robot; if (r) { const from = r.center(), to = player.group.position.clone().setY(1.4); for (let k = 0; k < 14; k++) { const d = to.clone().sub(from).normalize(); glowP.emit(from.x, from.y, from.z, d.x * 9 + (Math.random() - .5) * 2, d.y * 9 + (Math.random() - .5) * 2, d.z * 9 + (Math.random() - .5) * 2, 0xff5a6a, 1.0, 0.45, 0, 0.5); } r.flash(0.5); }
    glowP.burst(player.group.position.clone().setY(1.4), 20, 0xff5a6a, 4, 0.7, 0.5);
  }
}
$('nextBtn').addEventListener('click', () => { A.sfx.click(); nextEncounter(); });

/* ====================== سير اللعبة ====================== */
function resetRobots() { minions.forEach(m => { m.group.visible = false; m.fill && (m.bar.visible = false); }); S.minions = []; robots.forEach(r => { r.group.visible = false; r.group.scale.setScalar(ROBOT_SPECS[robots.indexOf(r)].scale); r.group.rotation.set(0, 0, 0); r.root.rotation.set(0, 0, 0); r.threat = 0; r.reticle.material.opacity = 0; r.bar.visible = false; r.flashT = 0; }); }
function startGame() {
  A.init(); S.enc = 0; S.score = 0; S.firstTry = 0; S.energy = 1; S.winT = 0; S.seq = null; S.robot = null;
  world.victory.visible = false; world.vlight.intensity = 0; glowP.clear(); starP.clear(); confP.clear(); balls.forEach(b => b.visible = false); tracers.forEach(t => t.visible = false);
  resetRobots(); player.aim = 0; player.cheer = 0; pos.copy(START); pos.y = 0; heading.yaw = 0; player.group.rotation.y = 0; S.off = 0; camInit = false;
  $('win').classList.remove('show'); $('panel').classList.add('off'); $('hud').classList.remove('vic'); $('hud').classList.remove('hidden'); $('hud').classList.remove('nx'); $('nextBtn').classList.add('hidden');
  setScore(); setEnergy(); setEnc(); beginLeg(); S.hintT = 0; $('hint').style.opacity = 1;
}
function beginLeg() {
  const e = E[S.enc]; S.mode = 'walk'; S.wp = e.route.slice(1).map(v => v.clone()); S.legT = 0; S.spawned = false; S.rState = 'none'; S.robot = null; S.camTarget = 0; setEnc();
}
function spawnRobot() {
  const e = E[S.enc], r = robots[S.enc]; S.robot = r; S.spawned = true; S.rState = 'walk';
  r.group.visible = true; r.group.position.copy(e.spawn); r.group.scale.setScalar(0.01); r.group.rotation.set(0, 0, 0); r.root.rotation.set(0, 0, 0); r.threat = 0; r.spawnT = 0; r.flashT = 0;
  const c = e.spawn.clone().setY(1.5); glowP.burst(c, 40, 0xb48cff, 7, 1.4, 0.8, 0, 3); glowP.burst(c, 25, 0x7de8ff, 4, 1.0, 0.8);
  A.sfx.spawn();
  // مسيّرتان تحلّقان من اتجاهات مختلفة إلى مواقعهما خلف الروبوت الرئيسي
  const slots = [e.R.clone().addScaledVector(e.f, 3).addScaledVector(e.r, 2.2), e.R.clone().addScaledVector(e.f, 6).addScaledVector(e.r, 4.8)];
  const froms = [e.spawn.clone().addScaledVector(e.f, 12).addScaledVector(e.r, 8), e.R.clone().addScaledVector(e.f, 22).addScaledVector(e.r, -16)];
  S.minions = minions.map((m, i) => {
    m.group.visible = true; m.group.position.copy(froms[i]); m.group.position.y = 2.2; m.group.scale.setScalar(0.01); m.group.rotation.set(0, 0, 0); m.root.rotation.set(0, 0, 0); m.flashT = 0; m.threat = 0; m.spawnT = -0.25 - i * 0.2; m.reticle.material.opacity = 0; m.bar.visible = false;
    glowP.burst(froms[i].clone().setY(2.2), 18, 0xff8bd0, 5, 1.0, 0.6);
    return { r: m, target: slots[i].setY(i ? 4.6 : 3.0), state: 'fly' };
  });
}
function updateMinions(dt) {
  for (const mn of S.minions || []) {
    const r = mn.r; if (!r.group.visible || mn.state === 'dead') continue;
    r.update(dt, mn.state === 'fly'); r.spawnT += dt;
    if (mn.state === 'fly') {
      if (r.spawnT < 0) { r.group.scale.setScalar(0.01); continue; }
      const k = clamp(r.spawnT / 0.5, 0, 1); r.group.scale.setScalar(Math.max(0.01, ease(k)) * r.spec.scale);
      const to = mn.target.clone().sub(r.group.position), d = to.length();
      if (d < 0.25) mn.state = 'ready'; else { to.normalize(); r.group.position.addScaledVector(to, Math.min(d, 9 * dt)); r.group.rotation.y += angDiff(r.group.rotation.y, Math.atan2(to.x, to.z)) * (1 - Math.exp(-10 * dt)); }
    } else if (mn.state === 'ready') {
      r.threat += (1 - r.threat) * (1 - Math.exp(-5 * dt)); r.group.rotation.y += angDiff(r.group.rotation.y, yawTo(r.group.position, player.group.position)) * (1 - Math.exp(-6 * dt));
      r.group.position.y = mn.target.y + Math.sin(S.t * 2.4 + r.spec.scale * 9) * 0.18;
    }
  }
}
function nextEncounter() {
  $('panel').classList.add('off'); $('nextBtn').classList.add('hidden'); $('hud').classList.remove('nx');
  if (S.enc >= 5) { victory(); return; }
  S.enc++; player.aim = 0; beginLeg();
}
function victory() {
  S.mode = 'victory'; S.winT = 0;
  A.sfx.win();
  world.victory.visible = true; world.vlight.intensity = 3;
  resetRobots();
  pos.set(-4.3, 0, -1.6); heading.yaw = 0.35; player.group.rotation.y = 0.35; player.aim = 0; player.cheer = 1;
  $('wScore').textContent = `${AR(S.score)} من ${AR(60)}`; $('wFirst').textContent = `${AR(S.firstTry)} من ${AR(6)}`; $('wDone').textContent = `${AR(6)} من ${AR(6)}`;
  $('hud').classList.add('vic'); $('win').classList.add('show');
  for (let i = 0; i < 6; i++) setTimeout(() => fireworks(), 300 + i * 450);
}
function fireworks() {
  if (S.mode !== 'victory') return;
  const p = new V3((Math.random() - .5) * 46, 14 + Math.random() * 14, -14 - Math.random() * 18), cols = [0xffd84a, 0xff5a8a, 0x5ae0ff, 0x8aff7a, 0xc08aff, 0xffa24a], c = cols[Math.random() * cols.length | 0];
  glowP.burst(p, 70, c, 11, 1.3, 1.6, 4); glowP.burst(p, 24, 0xffffff, 6, 0.8, 1.2, 4); A.sfx.firework();
}

/* ====================== التحديث ====================== */
function updateWalk(dt) {
  const e = E[S.enc]; S.legT += dt;
  const tgt = S.wp[0]; const final = S.wp.length === 1;
  const to = tgt.clone().sub(pos); to.y = 0; const dist = to.length(); const dirN = to.clone().normalize();
  const right = new V3(-dirN.z, 0, dirN.x);
  // توجيه يدوي بسيط (أسهم / WASD / سحب)
  const steer = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  if (steer) { S.off = clamp(S.off + steer * 7 * dt, -6, 6); S.hintT = 99; } else S.off *= Math.pow(0.55, dt);
  const fade = final ? clamp((dist - 4) / 6, 0, 1) : 1;
  const tp = tgt.clone().addScaledVector(right, S.off * fade);
  let speed = 7.2 * (keys.ArrowUp || keys.KeyW ? 1.5 : keys.ArrowDown || keys.KeyS ? 0.55 : 1);
  if (final) speed *= clamp(0.3 + dist / 5, 0, 1);
  speed *= clamp(S.legT / 0.6, 0.25, 1);
  const mv = tp.clone().sub(pos); mv.y = 0; const md = mv.length();
  let moving = 0;
  if (!(final && dist < 0.35)) {
    mv.normalize(); const step = Math.min(speed * dt, md);
    pos.addScaledVector(mv, step); moving = speed; S.speedNow = speed;
    heading.yaw += angDiff(heading.yaw, Math.atan2(mv.x, mv.z)) * (1 - Math.exp(-10 * dt));
    collide(pos, 0.55, world.colliders);
  }
  player.group.rotation.y = heading.yaw; player.update(dt, moving);
  if (Math.floor(S.legT * 3.2) !== Math.floor((S.legT - dt) * 3.2) && moving > 1) A.sfx.step();
  if (!final && dist < 2.5) S.wp.shift();
  if (!S.spawned && S.legT > 0.8 && (to.length() + (final ? 0 : S.wp.slice(1).reduce((a, w, i, arr) => a + w.distanceTo(i ? arr[i - 1] : tgt), 0)) < 15)) spawnRobot();
  updateRobot(dt);
  if (final && dist < 0.4 && S.rState === 'ready') engage();
  if (final && dist < 0.4 && S.rState !== 'ready') player.update(0, 0);
}
function updateRobot(dt) {
  const r = S.robot; if (!r) return;
  const e = E[S.enc]; r.update(dt, S.rState === 'walk');
  if (S.rState === 'walk') {
    r.spawnT += dt; const k = clamp(r.spawnT / 0.5, 0, 1); r.group.scale.setScalar(Math.max(0.01, ease(k)) * ROBOT_SPECS[S.enc].scale);
    const to = e.R.clone().sub(r.group.position); to.y = 0; const d = to.length();
    if (d < 0.2) { S.rState = 'ready'; } else { to.normalize(); r.group.position.addScaledVector(to, Math.min(d, 7.5 * dt * clamp(r.spawnT / 0.4, 0.3, 1))); r.group.rotation.y += angDiff(r.group.rotation.y, Math.atan2(to.x, to.z)) * (1 - Math.exp(-12 * dt)); }
  } else if (S.rState === 'ready' || S.rState === 'threat') {
    r.group.rotation.y += angDiff(r.group.rotation.y, yawTo(r.group.position, player.group.position)) * (1 - Math.exp(-8 * dt));
    if (S.rState === 'threat') r.threat += (1 - r.threat) * (1 - Math.exp(-6 * dt));
  }
}
function engage() {
  S.mode = 'engage'; S.engT = 0; S.rState = 'threat'; S.hintT = 99;
  const r = S.robot; r.bar.visible = true; r.fill.scale.x = 1.6; r.fill.position.x = 0;
}
function updateEngage(dt) {
  const e = E[S.enc], r = S.robot; S.engT += dt;
  heading.yaw += angDiff(heading.yaw, yawTo(pos, r.group.position)) * (1 - Math.exp(-9 * dt)); player.group.rotation.y = heading.yaw;
  player.aim += (1 - player.aim) * (1 - Math.exp(-7 * dt)); player.update(dt, 0); updateRobot(dt);
  r.reticle.material.opacity += (0.95 - r.reticle.material.opacity) * (1 - Math.exp(-6 * dt));
  if (S.engT > 1.0) showQuestion();
}
function updateQuestion(dt) {
  const r = S.robot;
  heading.yaw += angDiff(heading.yaw, yawTo(pos, r.group.position)) * (1 - Math.exp(-9 * dt)); player.group.rotation.y = heading.yaw;
  player.update(dt, 0); updateRobot(dt);
  r.reticle.material.opacity = 0.7 + 0.25 * Math.sin(S.t * 5);
  if (S.mode === 'defeat') updateDefeat(dt);
}
function shotsFor() {
  const out = []; (S.minions || []).forEach((mn, i) => { if (mn.state !== 'dead' && mn.r.group.visible) out.push({ t: mn, r: mn.r, at: 0.3 + i * 0.17, main: false, scale: mn.r.spec.scale, i }); });
  out.push({ t: null, r: S.robot, at: 0.3 + out.length * 0.17 + 0.05, main: true, scale: ROBOT_SPECS[S.enc].scale });
  return out;
}
function worldToScreen(v) { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * innerWidth, (-p.y * 0.5 + 0.5) * innerHeight]; }
function floatText(text, v, cls = '') { const [x, y] = worldToScreen(v); const d = document.createElement('div'); d.className = 'fl ' + cls; d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px'; $('ui').appendChild(d); setTimeout(() => d.remove(), 1300); }
function hitMarker(v) { const [x, y] = worldToScreen(v), h = $('hitm'); h.style.left = x + 'px'; h.style.top = y + 'px'; h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); }
function feed(text) { const d = document.createElement('div'); d.className = 'fd glass'; d.textContent = text; $('feed').prepend(d); while ($('feed').children.length > 4) $('feed').lastChild.remove(); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 600); }, 4200); }
function fireShot(sh, idx) {
  A.sfx.shoot(); player.aim = 1; player.kick(); S.shake = Math.max(S.shake, 0.22); muzzleLight.intensity = 6;
  player.group.updateMatrixWorld(true); const m = new V3(); player.muzzle.getWorldPosition(m); sh.r.group.updateMatrixWorld(true);
  sh.from = m; sh.to = sh.r.center(); sh.bt = 0; sh.fired = true; balls[idx].visible = true; glowP.burst(m, 16, 0x9affd0, 4.5, 1.0, 0.3);
  const tr = tracers[idx], d = sh.to.clone().sub(m), L = d.length(); tr.visible = true; tr.position.copy(m).addScaledVector(d, 0.5); tr.scale.set(1, L, 1); tr.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); tr.material.opacity = 1; sh.tracer = tr;
}
function updateDefeat(dt) {
  const s = S.seq, e = E[S.enc]; if (!s) return; s.t += dt;
  if (!s.shots) { s.shots = shotsFor(); S.robot.reticle.material.opacity = 0; }
  S.robot.reticle.material.opacity = Math.max(0, S.robot.reticle.material.opacity - dt * 3);
  player.group.updateMatrixWorld(true);
  s.shots.forEach((sh, idx) => {
    const r = sh.r;
    if (!sh.fired && s.t > sh.at) fireShot(sh, idx);
    if (sh.tracer) { sh.tracer.material.opacity = Math.max(0, sh.tracer.material.opacity - dt * 6); if (sh.tracer.material.opacity <= 0) sh.tracer.visible = false; }
    if (sh.fired && !sh.hit) {
      sh.bt += dt / 0.26; const k = clamp(sh.bt, 0, 1), b = balls[idx]; sh.to = r.center(); b.position.lerpVectors(sh.from, sh.to, k);
      glowP.emit(b.position.x, b.position.y, b.position.z, (Math.random() - .5) * 1.5, (Math.random() - .5) * 1.5, (Math.random() - .5) * 1.5, 0x7dffc0, 1.0, 0.35, 0, 1);
      if (k >= 1) { sh.hit = true; sh.ht = 0; b.visible = false; r.flash(1); A.sfx.hurt(); glowP.burst(sh.to, 44, 0x9affd0, 10, 1.3, 0.7); starP.burst(sh.to, 16, 0xffd84a, 8, 1.5, 1.1, 2, 3); hitMarker(sh.to); floatText('إصابة!', sh.to.clone().add(new V3(0, 1.4, 0)), 'hit'); S.shake = Math.max(S.shake, 0.3); }
    }
    if (sh.hit && !sh.done) {
      sh.ht += dt; const t = sh.ht, back = e.r.clone();
      if (t < 0.5) { r.group.position.addScaledVector(back, dt * 3.2 * (1 - t / 0.5)); r.root.rotation.z = -Math.sin(t / 0.5 * Math.PI) * 0.5; r.root.rotation.x = -t * 0.8; }
      else { r.group.rotation.y += dt * 16; r.root.position.y = Math.sin((t - 0.5) / 0.6 * Math.PI) * 1.4; const k = clamp((t - 0.5) / 0.6, 0, 1); r.group.scale.setScalar(Math.max(0.001, sh.scale * (1 - ease(k)))); }
      if (sh.main) { r.fill.scale.x = Math.max(0.001, 1.6 * (1 - clamp(t / 0.4, 0, 1))); r.bar.visible = t < 0.6; }
      if (t > 0.1 && t < 1.1 && Math.random() < 0.7) { const a = S.t * 8, c = r.group.position; starP.emit(c.x + Math.cos(a) * 1.2, c.y + 3.2 * (sh.scale > 0.8 ? 1 : 0.5), c.z + Math.sin(a) * 1.2, 0, 1.2, 0, 0xffd84a, 1.0, 0.7, 0, 0.5); }
      if (t > 1.15) {
        sh.done = true; r.group.visible = false; if (sh.t) sh.t.state = 'dead'; const c = r.group.position.clone().setY(1.4);
        glowP.burst(c, 34, 0xffd84a, 8, 1.1, 1.0, 2, 2); glowP.burst(c, 14, 0xfff0c0, 5, 1.1, 0.8, 0, 1); starP.burst(c, 18, 0xffd84a, 9, 1.6, 1.2, 3, 4);
        for (let i = 0; i < 40; i++) confP.emit(c.x, c.y, c.z, (Math.random() - .5) * 9, 3 + Math.random() * 6, (Math.random() - .5) * 9, new THREE.Color().setHSL(Math.random(), 0.9, 0.6), 0.28, 1.6, 9, 0.4);
        A.sfx.pop(); feed('🎯 إسقاط ' + (sh.main ? NAMES[S.enc] : 'مسيّرة'));
      }
    }
  });
  if (!s.done && s.shots.every(x => x.done)) {
    s.done = true; S.mode = 'between'; drawDots();
    const nb = $('nextBtn'); nb.textContent = S.enc >= 5 ? 'إنهاء المعركة ◀' : 'المواجهة التالية ◀'; nb.classList.remove('hidden'); $('hud').classList.add('nx');
  }
}
function updateBetween(dt) { player.aim += (1 - player.aim) * (1 - Math.exp(-4 * dt)); player.update(dt, 0); }
function updateVictory(dt) {
  S.winT += dt; player.cheer = 1; player.update(dt, 0);
  player.group.rotation.y = 0.35 + Math.sin(S.winT * 1.4) * 0.15;
  // قصاصات وتألق
  for (let i = 0; i < 3; i++) confP.emit((Math.random() - .5) * 26, 16, -4 + (Math.random() - .5) * 20, (Math.random() - .5) * 2, -1, (Math.random() - .5) * 2, new THREE.Color().setHSL(Math.random(), 0.9, 0.6), 0.3, 6, 2.2, 0.2);
  if (Math.random() < dt * 8) { const a = Math.random() * 6.28, r = 2 + Math.random() * 5; starP.emit(Math.cos(a) * r, 0.5, -4 + Math.sin(a) * r, 0, 2 + Math.random() * 2, 0, 0xffd84a, 1.2, 2.5, 0, 0.2); }
  if (Math.random() < dt * 1.1) fireworks();
}

function updateCamera(dt) {
  const t = S.t, d = new V3(Math.sin(heading.yaw), 0, Math.cos(heading.yaw)), right = new V3(-d.z, 0, d.x);
  // كاميرا فوق الكتف (أسلوب ألعاب القتال): خلف اللاعب وإلى يمينه، والنظر إلى الأمام
  const fp = pos.clone().addScaledVector(d, -4.9).addScaledVector(right, 1.25).add(new V3(0, 2.55, 0));
  const fl = pos.clone().addScaledVector(d, 11).addScaledVector(right, 1.6).add(new V3(0, 1.45, 0));
  if (!camInit) { cp.copy(fp); cl.copy(fl); camInit = true; }
  const k = 1 - Math.exp(-4.5 * dt); cp.lerp(fp, k); cl.lerp(fl, 1 - Math.exp(-7 * dt));
  let ep, el, blend;
  const half = Math.tan(S.baseFov * Math.PI / 360) * camera.aspect;
  const D = clamp((SEP / 2) / (0.7 * half), 9, 20);
  if (S.mode === 'victory') {
    const a = 0.0 + Math.sin(S.winT * 0.35) * 0.5, c = new V3(0, 0, -4);
    ep = new V3(c.x + Math.sin(a) * 13, 4.0, c.z + Math.cos(a) * 13); el = new V3(c.x + 1.6, 2.8, c.z); blend = 1;
  } else {
    let e = E[S.enc], P = e.P, R = e.R, f = e.f;
    if (S.mode === 'menu') { P = START; R = START.clone().add(new V3(SEP, 0, 0)); const a = Math.sin(t * 0.25) * 0.28; f = new V3(Math.sin(a), 0, -Math.cos(a)); }
    const M = P.clone().add(R).multiplyScalar(0.5);
    ep = M.clone().addScaledVector(f, -D).add(new V3(Math.sin(t * 0.4) * 0.5, 2.9 + Math.sin(t * 0.3) * 0.15, 0)); el = M.clone().add(new V3(0, 2.7, 0));
    const want = (S.mode === 'menu' || S.mode === 'engage' || S.mode === 'question' || S.mode === 'defeat' || S.mode === 'between') ? 1 : 0;
    S.camBlend += (want - S.camBlend) * (1 - Math.exp(-(want ? 3.4 : 3.0) * dt)); blend = S.camBlend;
    if (S.mode === 'menu') { blend = 1; S.camBlend = 1; }
  }
  const b = ease(clamp(blend, 0, 1));
  camera.position.lerpVectors(cp, ep, b); const look = new V3().lerpVectors(cl, el, b);
  if (S.mode === 'victory') { camera.position.copy(ep); look.copy(el); }
  camera.lookAt(look);
  // زاوية الرؤية: أوسع أثناء الجري، وأضيق في المواجهة + اهتزاز عند الإطلاق/الإصابة
  const fovT = S.baseFov + (1 - b) * 9 + (S.mode === 'walk' ? clamp(S.speedNow / 7.2, 0, 1.6) * 2.5 : 0);
  S.fov += (fovT - S.fov) * (1 - Math.exp(-6 * dt));
  if (Math.abs(camera.fov - S.fov) > 0.01) { camera.fov = S.fov; camera.updateProjectionMatrix(); allP.forEach(p => p.setScale(innerHeight * renderer.getPixelRatio(), camera.fov)); }
  if (S.shake > 0.001) { camera.position.x += (Math.random() - .5) * S.shake; camera.position.y += (Math.random() - .5) * S.shake; S.shake *= Math.pow(0.002, dt); }
  if (S.mode === 'walk') camera.position.y += Math.sin(S.t * 13) * 0.035 * clamp(S.speedNow / 7.2, 0, 1.4);
  // الظل يتبع مركز الحدث
  const focus = S.mode === 'victory' ? new V3(0, 0, -4) : pos.clone().lerp(S.robot ? S.robot.group.position : pos, 0.5);
  sun.target.position.copy(focus); sun.position.copy(focus).add(new V3(-22, 36, 20));
  if (S.mode !== 'victory' && S.mode !== 'menu') { /* حركة بسيطة: ضوء الانتصار */ }
}

function ambient(dt) {
  if (Math.random() < dt * 12) { const f = pos; glowP.emit(f.x + (Math.random() - .5) * 30, 0.3 + Math.random() * 3, f.z + (Math.random() - .5) * 30, (Math.random() - .5) * .4, 0.5 + Math.random() * 0.5, (Math.random() - .5) * .4, Math.random() > .5 ? 0x7de8ff : 0xffe08a, 0.45, 4, 0, 0); }
}

/* ====================== الخريطة المصغرة (رادار) ====================== */
const radar = $('radar'), rg = radar.getContext('2d');
function drawRadar() {
  const W = radar.width, c = W / 2, sc = (W / 2 - 6) / 46, X = (x) => c + x * sc, Z = (z) => c + z * sc;
  rg.clearRect(0, 0, W, W); rg.save(); rg.beginPath(); rg.arc(c, c, c - 2, 0, 7); rg.clip();
  rg.fillStyle = 'rgba(8,26,76,.82)'; rg.fillRect(0, 0, W, W);
  rg.fillStyle = 'rgba(222,200,150,.28)'; rg.fillRect(X(-44), Z(-44), 88 * sc, 88 * sc);
  rg.fillStyle = 'rgba(255,224,150,.55)'; rg.fillRect(X(-44), Z(-52), 88 * sc, 8 * sc); // القلعة شمالًا
  rg.strokeStyle = 'rgba(120,210,255,.25)'; rg.lineWidth = 1; for (let i = -2; i <= 2; i++) { rg.beginPath(); rg.moveTo(X(i * 20), 0); rg.lineTo(X(i * 20), W); rg.moveTo(0, Z(i * 20)); rg.lineTo(W, Z(i * 20)); rg.stroke(); }
  E.forEach((e, i) => { rg.beginPath(); rg.arc(X(e.P.x), Z(e.P.z), 3, 0, 7); rg.fillStyle = i === S.enc ? '#ffd93a' : i < S.enc ? '#39e08a' : 'rgba(120,230,255,.7)'; rg.fill(); });
  const dot = (v, r2, col) => { rg.beginPath(); rg.arc(X(v.x), Z(v.z), r2, 0, 7); rg.fillStyle = col; rg.fill(); };
  if (S.robot && S.robot.group.visible) dot(S.robot.group.position, 4.5, '#ff4d5e');
  (S.minions || []).forEach(m => { if (m.r.group.visible) dot(m.r.group.position, 3, '#ff9aa6'); });
  rg.translate(X(pos.x), Z(pos.z)); rg.rotate(Math.PI - heading.yaw); rg.fillStyle = '#fff'; rg.strokeStyle = '#2a8cff'; rg.lineWidth = 2; rg.beginPath(); rg.moveTo(0, -7); rg.lineTo(5, 5); rg.lineTo(0, 2); rg.lineTo(-5, 5); rg.closePath(); rg.fill(); rg.stroke();
  rg.restore(); rg.strokeStyle = 'rgba(110,205,255,.9)'; rg.lineWidth = 3; rg.beginPath(); rg.arc(c, c, c - 2, 0, 7); rg.stroke();
}

/* ====================== الحلقة الرئيسية ====================== */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(DTMAX, (now - last) / 1000); last = now; S.t += dt;
  // جودة تلقائية: إن كان الأداء ضعيفًا
  if (S.autoQ && S.quality === 'high' && S.mode !== 'menu') { S.fpsAcc += (now - (frame.p || now)) / 1000; S.fpsN++; if (S.fpsN === 150) { if (S.fpsAcc / 150 > 1 / 20) { setQuality('low'); toast('تم تخفيف الرسومات تلقائيًا لتحسين الأداء'); } S.autoQ = false; } } frame.p = now;
  switch (S.mode) {
    case 'menu': player.update(dt, 0); player.aim = 0.0; if (!robots[0].group.visible) { const r = robots[0]; r.group.visible = true; r.group.position.copy(START).add(new V3(SEP, 0, 0)); r.group.rotation.y = -Math.PI / 2; r.threat = 0.7; r.group.scale.setScalar(ROBOT_SPECS[0].scale); } robots[0].update(dt, false); player.group.rotation.y = Math.PI / 2 * 0.9 * 1 + 0; player.aim = 0.6; break;
    case 'walk': updateWalk(dt); break;
    case 'engage': updateEngage(dt); break;
    case 'question': case 'defeat': updateQuestion(dt); break;
    case 'between': updateBetween(dt); break;
    case 'victory': updateVictory(dt); break;
  }
  if (S.mode === 'between' || S.mode === 'defeat') robots.forEach(r => { if (r !== S.robot) return; });
  if (S.hintT < 90) { S.hintT += dt; if (S.hintT > 9) { $('hint').style.opacity = 0; S.hintT = 99; } }
  if (S.mode !== 'walk') S.speedNow = 0;
  updateMinions(dt); world.update(S.t, dt); ambient(dt);
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 40); if (muzzleLight.intensity > 0) player.muzzle.getWorldPosition(muzzleLight.position);
  // غبار خلف القدمين أثناء الجري
  if (S.mode === 'walk' && S.speedNow > 1) { S.dustT -= dt; if (S.dustT <= 0) { S.dustT = 0.09; confP.emit(pos.x + (Math.random() - .5) * 0.4, 0.12, pos.z + (Math.random() - .5) * 0.4, (Math.random() - .5) * 0.8, 0.8, (Math.random() - .5) * 0.8, 0xd8c39a, 0.55, 0.6, -0.5, 1.5, 1.5); } }
  updateCamera(dt);
  allP.forEach(p => p.update(dt));
  // علامة التصويب تظهر أثناء الجري فقط
  $('xhair').style.opacity = S.mode === 'walk' ? 0.9 : 0;
  S.radarT -= dt; if (S.radarT <= 0 && S.mode !== 'menu' && S.mode !== 'victory') { S.radarT = 0.07; drawRadar(); }
  if (composer && S.quality === 'high') composer.render(); else renderer.render(scene, camera);
}

/* ====================== المقاس والجودة ====================== */
let composer = null;
{ const w = innerWidth, h = innerHeight; const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.5, 1.35)); composer.addPass(new OutputPass()); }
function resize() {
  const w = innerWidth, h = innerHeight, q = S.quality === 'high' ? Math.min(devicePixelRatio || 1, 1.75) : 1;
  renderer.setPixelRatio(q); renderer.setSize(w, h, false);
  S.baseFov = 48 + clamp(1.6 - w / h, 0, 1) * 30; camera.aspect = w / h; camera.fov = S.fov = S.baseFov + 9; camera.updateProjectionMatrix();
  allP.forEach(p => p.setScale(h * q, camera.fov));
  if (composer) { composer.setPixelRatio(q); composer.setSize(w, h); }
}
function setQuality(q) {
  S.quality = q; const hi = q === 'high';
  renderer.shadowMap.enabled = hi; sun.castShadow = hi; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  world.palms.count = hi ? world.palms.instanceMatrix.count : 14; world.clouds.forEach((c, i) => c.visible = hi || i < 4);
  allP.forEach(p => p.density = hi ? 1 : 0.4); resize();
  const txt = '⚙ الرسومات: ' + (hi ? 'عالية' : 'منخفضة'); $('sQual').textContent = txt; $('bQual').title = txt;
}
addEventListener('resize', resize); resize(); setQuality(S.quality);

/* ====================== الإدخال والأزرار ====================== */
addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); keys[e.code] = true; if (e.code === 'Enter' && S.mode === 'between') nextEncounter(); });
addEventListener('keyup', (e) => keys[e.code] = false);
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; });
addEventListener('pointermove', (e) => { if (drag !== null && S.mode === 'walk') { S.off = clamp(S.off + (e.clientX - drag) / innerWidth * 40, -6, 6); drag = e.clientX; S.hintT = 99; } });
addEventListener('pointerup', () => drag = null);

function goFull() { const d = document, el = d.documentElement; if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); }
function syncSfx() { const on = A.isSfx(); $('bSfx').textContent = on ? '🔊' : '🔇'; $('bSfx').classList.toggle('off', !on); $('sSfx').textContent = '🔊 الصوت: ' + (on ? 'يعمل' : 'متوقف'); }
function toggleSfx() { A.init(); A.setSfx(!A.isSfx()); syncSfx(); A.sfx.click(); }
$('bSfx').onclick = toggleSfx; $('sSfx').onclick = toggleSfx;
$('bMus').onclick = () => { A.init(); A.setMusic(!A.isMusic()); $('bMus').classList.toggle('off', !A.isMusic()); if (A.isMusic()) A.startMusic(); };
$('bFull').onclick = goFull;
$('bQual').onclick = () => { A.sfx.click(); setQuality(S.quality === 'high' ? 'low' : 'high'); toast('الرسومات: ' + (S.quality === 'high' ? 'عالية' : 'منخفضة')); S.autoQ = false; };
$('sQual').onclick = () => { setQuality(S.quality === 'high' ? 'low' : 'high'); S.autoQ = false; };
$('bRestart').onclick = () => { A.sfx.click(); $('confirm').classList.remove('hidden'); };
$('cNo').onclick = () => $('confirm').classList.add('hidden');
$('cYes').onclick = () => { $('confirm').classList.add('hidden'); A.sfx.click(); startGame(); };
$('again').onclick = () => { A.sfx.click(); startGame(); };
$('goBtn').onclick = () => {
  A.init(); A.sfx.start(); if (A.isMusic()) A.startMusic();
  $('start').classList.add('out'); setTimeout(() => $('start').classList.add('hidden'), 750);
  startGame();
};
$('bSub').textContent = '📖 ' + META.subject; $('bGrade').textContent = '👥 ' + META.grade.replace('الصف ', 'الصف: ');
syncSfx();
window.__game = { S, E, QUESTIONS, world, player, robots, start: () => $('goBtn').click(), setQuality,
  jump(n) { startGame(); S.enc = n; pos.copy(E[n].route[0]); camInit = false; for (let i = 0; i < n; i++) { /* مواجهات سابقة */ } beginLeg(); }, win() { startGame(); S.score = 40; S.firstTry = 2; victory(); } };
requestAnimationFrame(frame);
