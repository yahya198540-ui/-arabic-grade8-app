import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';

const M = (color, rough = 0.55, metal = 0, em = 0x000000, emI = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: em, emissiveIntensity: emI });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const sph = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = mesh(new THREE.SphereGeometry(r, 24, 16), mat, x, y, z); m.scale.set(sx, sy, sz); return m; };
const rbox = (w, h, d, mat, x, y, z, r = 0.12) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z);
const cyl = (rt, rb, h, mat, x, y, z, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
export function enableShadows(g, cast = true) { g.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = false; } }); }

/* =========================== الطالب العُماني =========================== */
export function makePlayer() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = M(0xc98a58, 0.7), white = M(0xfbf9f3, 0.85), dark = M(0x1b1b22, 0.6);
  const gray = M(0x3d4856, 0.45, 0.35), cyan = M(0x35e6ff, 0.3, 0, 0x35e6ff, 1.4);

  // الثوب (الدشداشة)
  const pts = [[0.01, 0.3], [0.5, 0.3], [0.48, 0.5], [0.42, 0.85], [0.35, 1.2], [0.34, 1.38], [0.2, 1.44], [0.01, 1.46]].map(p => new THREE.Vector2(p[0], p[1]));
  const robe = mesh(new THREE.LatheGeometry(pts, 28), white); robe.scale.z = 0.82; body.add(robe);
  // الفُرّاكة (شرّابة الثوب العُماني)
  const tassel = cyl(0.025, 0.045, 0.34, M(0xd9c7a1, 0.8), 0, 1.22, 0.32, 8); tassel.rotation.x = 0.12; body.add(tassel);
  body.add(sph(0.05, M(0x9a7b4f), 0, 1.04, 0.33));
  // الحزام والأشرطة
  const belt = mesh(new THREE.TorusGeometry(0.4, 0.045, 8, 28), M(0x7a5a33, 0.7), 0, 0.82, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.82, 1); body.add(belt);
  for (const s of [-1, 1]) { const st = rbox(0.07, 0.78, 0.04, M(0x4a3a2a, 0.7), s * 0.2, 1.1, 0.29, 0.02); st.rotation.z = s * -0.12; body.add(st); }
  // الرأس
  const head = new THREE.Group(); head.position.y = 1.78; body.add(head);
  head.add(sph(0.47, skin, 0, 0, 0, 1, 1.02, 0.97));
  for (const s of [-1, 1]) {
    head.add(sph(0.1, skin, s * 0.47, -0.02, -0.02, 0.6, 1, 1));
    head.add(sph(0.108, M(0xffffff, 0.3), s * 0.17, 0.02, 0.4, 1, 1.05, 0.55));
    head.add(sph(0.065, M(0x2a1a0f, 0.3), s * 0.17, 0.02, 0.45, 1, 1.1, 0.5));
    head.add(sph(0.022, M(0xffffff, 0.2, 0, 0xffffff, 1), s * 0.15 + 0.02, 0.06, 0.49));
    const br = rbox(0.17, 0.045, 0.04, dark, s * 0.17, 0.16, 0.43, 0.015); br.rotation.z = s * -0.2; head.add(br);
    head.add(sph(0.07, M(0xe58d78, 0.8), s * 0.27, -0.12, 0.34, 1, 0.7, 0.4)); // وجنتان
  }
  head.add(sph(0.045, M(0xb9764a, 0.7), 0, -0.07, 0.46));
  const smile = mesh(new THREE.TorusGeometry(0.1, 0.017, 6, 16, Math.PI), M(0x6a2a1c, 0.6), 0, -0.17, 0.42); smile.rotation.z = Math.PI; head.add(smile);
  const hair = mesh(new THREE.SphereGeometry(0.485, 28, 16, Math.PI, Math.PI, 0, Math.PI * 0.78), dark, 0, 0.0, -0.02); head.add(hair);
  const kt = T.kuma();
  const cap = mesh(new THREE.CylinderGeometry(0.35, 0.47, 0.34, 28, 1, true), new THREE.MeshStandardMaterial({ map: kt, roughness: 0.9, side: THREE.DoubleSide }), 0, 0.37, -0.03);
  cap.rotation.x = -0.12; head.add(cap);
  const capTop = cyl(0.35, 0.35, 0.02, white, 0, 0.54, -0.05, 28); capTop.rotation.x = -0.12; head.add(capTop);
  // القدمان
  const feet = [];
  for (const s of [-1, 1]) { const f = new THREE.Group(); f.position.set(s * 0.17, 0.1, 0); f.add(rbox(0.2, 0.12, 0.4, M(0x5a3a22, 0.8), 0, 0, 0.06, 0.05)); f.add(cyl(0.07, 0.07, 0.2, skin, 0, 0.12, 0, 8)); body.add(f); feet.push(f); }
  // حقيبة الظهر المستقبلية
  const pack = new THREE.Group(); pack.position.set(0, 1.0, -0.4); body.add(pack);
  pack.add(rbox(0.62, 0.78, 0.3, gray, 0, 0, 0, 0.08));
  pack.add(rbox(0.12, 0.6, 0.32, cyan, -0.2, 0, 0.02, 0.03), rbox(0.12, 0.6, 0.32, cyan, 0.2, 0, 0.02, 0.03));
  pack.add(rbox(0.5, 0.14, 0.22, M(0xe8a23a, 0.5), 0, 0.46, 0, 0.05));
  const tank = cyl(0.12, 0.12, 0.6, gray, 0.38, -0.05, 0, 12); pack.add(tank);
  pack.add(sph(0.05, cyan, 0.38, 0.3, 0));
  // الذراعان + السلاح
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.43, 1.25, 0.02); body.add(a);
    a.add(cyl(0.125, 0.15, 0.5, white, 0, -0.25, 0, 14));
    a.add(sph(0.12, skin, 0, -0.58, 0));
    a.add(sph(0.15, white, 0, 0, 0));
    arms.push(a);
  }
  const gun = new THREE.Group(); gun.position.set(0, -0.58, 0.02); arms[0].add(gun); // اليد اليمنى = x سالب
  const gb = M(0xdfe6ee, 0.35, 0.4), gd = M(0x2a3340, 0.4, 0.5);
  gun.add(rbox(0.16, 0.5, 0.22, gb, 0, -0.18, 0, 0.05));
  gun.add(cyl(0.065, 0.075, 0.46, gd, 0, -0.62, 0, 12));
  gun.add(cyl(0.1, 0.1, 0.12, cyan, 0, -0.5, 0, 16));
  gun.add(rbox(0.1, 0.3, 0.1, gd, 0, 0.0, 0.12, 0.03));
  const ringG = mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 18), cyan, 0, -0.86, 0); ringG.rotation.x = Math.PI / 2; gun.add(ringG);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, -0.9, 0); gun.add(muzzle);
  gun.rotation.x = 0; // السبطانة على محور y السالب للذراع، فتتجه حيث تتجه الذراع
  enableShadows(root);

  const P = {
    group: root, body, head, arms, feet, muzzle, gunGlow: cyan, t: 0, aim: 0, hurt: 0, cheer: 0, walkAmt: 0,
    update(dt, speed) {
      this.t += dt; const t = this.t;
      this.walkAmt += ((speed > 0.2 ? 1 : 0) - this.walkAmt) * Math.min(1, dt * 9);
      const w = this.walkAmt, ph = t * (6 + speed * 0.5), aim = this.aim;
      body.position.y = Math.abs(Math.sin(ph)) * 0.09 * w + Math.sin(t * 2.2) * 0.012 * (1 - w) + this.cheer * Math.abs(Math.sin(t * 7)) * 0.4;
      body.rotation.x = -0.06 * w - this.hurt * 0.35; body.rotation.z = Math.sin(ph) * 0.03 * w;
      feet[0].position.z = Math.sin(ph) * 0.3 * w; feet[1].position.z = -Math.sin(ph) * 0.3 * w;
      feet[0].position.y = 0.1 + Math.max(0, Math.cos(ph)) * 0.1 * w; feet[1].position.y = 0.1 + Math.max(0, -Math.cos(ph)) * 0.1 * w;
      const ready = -0.9 - 0.05 * Math.sin(ph), aimA = -Math.PI / 2 + 0.04;
      const cheerA = -Math.PI + 0.3 + Math.sin(t * 9) * 0.25;
      let r = ready + (aimA - ready) * aim, l = (-0.55 + Math.sin(ph) * 0.5 * w) + ((-Math.PI / 2 + 0.1) - (-0.55 + Math.sin(ph) * 0.5 * w)) * aim;
      r += (cheerA - r) * this.cheer; l += (cheerA - l) * this.cheer;
      arms[0].rotation.x = r; arms[1].rotation.x = l;
      arms[0].rotation.z = 0.12 * this.cheer; arms[1].rotation.z = -0.12 - 0.25 * aim * (1 - this.cheer) - 0.1 * this.cheer;
      head.rotation.x = -0.05 * aim; head.rotation.y = Math.sin(t * 1.3) * 0.06 * (1 - aim);
      this.hurt *= Math.pow(0.02, dt);
    },
  };
  return P;
}

/* =========================== الروبوتات =========================== */
export const ROBOT_SPECS = [
  { type: 'biped', body: 0xeef2f7, accent: 0x5b7cff, eye: 0xffc400, scale: 1.0 },
  { type: 'hover', body: 0x3b8dff, accent: 0xe8f4ff, eye: 0x36f0ff, scale: 1.0 },
  { type: 'crab', body: 0x39c46a, accent: 0xffa726, eye: 0xfff176, scale: 1.0 },
  { type: 'tank', body: 0xff7a2f, accent: 0x3a3f4a, eye: 0xff4d4d, scale: 1.0 },
  { type: 'biped', body: 0x9a5cff, accent: 0xffd84a, eye: 0xff63e6, scale: 1.12, horns: true },
  { type: 'boss', body: 0xffc93c, accent: 0xb84a00, eye: 0xff2d2d, scale: 1.3, horns: true },
];

export function makeRobot(spec) {
  const g = new THREE.Group(), root = new THREE.Group(); g.add(root);
  const mats = [];
  const body = M(spec.body, 0.35, 0.25), acc = M(spec.accent, 0.4, 0.3), steel = M(0x6b7686, 0.45, 0.45), blk = M(0x14161d, 0.25, 0.4);
  const eyeM = M(spec.eye, 0.3, 0, spec.eye, 2.2);
  mats.push(body, acc);
  const R = { group: g, root, mats, eyeM, type: spec.type, t: Math.random() * 6, threat: 0, parts: {}, flashT: 0 };
  const isBiped = spec.type === 'biped' || spec.type === 'boss';

  if (isBiped) {
    root.add(rbox(1.1, 1.0, 0.8, body, 0, 1.45, 0, 0.22));
    root.add(rbox(0.5, 0.4, 0.06, blk, 0, 1.5, 0.4, 0.04), rbox(0.3, 0.2, 0.04, eyeM, 0, 1.5, 0.43, 0.03));
    root.add(rbox(1.14, 0.18, 0.84, acc, 0, 1.0, 0, 0.06));
    const head = new THREE.Group(); head.position.y = 2.38; root.add(head); R.parts.head = head;
    head.add(sph(0.52, body, 0, 0, 0, 1.12, 0.9, 1));
    head.add(sph(0.46, blk, 0, 0.0, 0.2, 1.05, 0.7, 0.62));
    head.add(sph(0.13, eyeM, -0.2, 0.02, 0.46), sph(0.13, eyeM, 0.2, 0.02, 0.46));
    for (const s of [-1, 1]) { const e = cyl(0.17, 0.17, 0.12, acc, s * 0.6, 0, 0, 16); e.rotation.z = Math.PI / 2; head.add(e); }
    head.add(cyl(0.025, 0.025, 0.4, steel, 0, 0.62, 0, 6), sph(0.07, eyeM, 0, 0.84, 0));
    if (spec.horns) for (const s of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.13, 0.5, 12), acc, s * 0.34, 0.55, 0); h.rotation.z = s * -0.4; head.add(h); }
    if (spec.type === 'boss') { const cr = mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.2, 8), M(0xffe27a, 0.3, 0.6, 0xaa7700, 0.4), 0, 0.5, 0); head.add(cr); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; head.add(mesh(new THREE.ConeGeometry(0.06, 0.2, 6), M(0xffe27a, 0.3, 0.6, 0xaa7700, 0.4), Math.cos(a) * 0.3, 0.7, Math.sin(a) * 0.3)); } }
    R.parts.arms = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(s * 0.78, 1.78, 0); root.add(a);
      a.add(sph(0.24, acc, 0, 0, 0), cyl(0.17, 0.2, 0.7, body, 0, -0.4, 0, 14), sph(0.27, steel, 0, -0.85, 0));
      R.parts.arms.push(a);
    }
    R.parts.legs = [];
    for (const s of [-1, 1]) {
      const l = new THREE.Group(); l.position.set(s * 0.32, 0.95, 0); root.add(l);
      l.add(cyl(0.2, 0.22, 0.6, steel, 0, -0.3, 0, 12), rbox(0.5, 0.22, 0.75, acc, 0, -0.78, 0.12, 0.08));
      R.parts.legs.push(l);
    }
  } else if (spec.type === 'hover') {
    const bd = new THREE.Group(); bd.position.y = 1.6; root.add(bd); R.parts.bd = bd;
    bd.add(sph(0.85, body, 0, 0, 0));
    const ring = mesh(new THREE.TorusGeometry(0.88, 0.1, 10, 36), acc, 0, 0, 0); ring.rotation.x = Math.PI / 2; bd.add(ring);
    bd.add(sph(0.52, blk, 0, 0.05, 0.5, 1, 1, 0.55), sph(0.3, eyeM, 0, 0.05, 0.72, 1, 1, 0.5));
    bd.add(cyl(0.05, 0.05, 0.5, steel, 0, 1.05, 0, 8));
    const prop = new THREE.Group(); prop.position.y = 1.32; bd.add(prop); R.parts.prop = prop;
    prop.add(rbox(1.5, 0.05, 0.18, acc, 0, 0, 0, 0.02), rbox(0.18, 0.05, 1.5, acc, 0, 0, 0, 0.02));
    R.parts.arms = [];
    for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 0.9, -0.1, 0.1); bd.add(a); a.add(cyl(0.1, 0.12, 0.5, steel, 0, -0.25, 0, 10), sph(0.2, acc, 0, -0.55, 0)); R.parts.arms.push(a); }
    const th = mesh(new THREE.ConeGeometry(0.4, 0.6, 16), M(0x4de0ff, 0.3, 0, 0x4de0ff, 2), 0, -1.05, 0); th.rotation.x = Math.PI; bd.add(th);
  } else if (spec.type === 'crab') {
    const bd = new THREE.Group(); bd.position.y = 0.95; root.add(bd); R.parts.bd = bd;
    bd.add(sph(1, body, 0, 0, 0, 1.35, 0.6, 1.05));
    for (let i = -1; i <= 1; i++) bd.add(sph(0.2, acc, i * 0.55, 0.52, -0.1, 1, 0.5, 1));
    bd.add(rbox(0.9, 0.18, 0.1, blk, 0, 0.1, 0.95, 0.04), rbox(0.5, 0.08, 0.06, eyeM, 0, 0.1, 1.0, 0.02));
    R.parts.legs = [];
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const l = new THREE.Group(); l.position.set(s * 1.0, -0.2, -0.45 + i * 0.5); l.rotation.z = s * -0.9; bd.add(l);
      l.add(cyl(0.07, 0.09, 0.9, steel, 0, -0.4, 0, 8)); l.userData = { s, i }; R.parts.legs.push(l);
    }
    R.parts.arms = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(s * 1.2, 0.0, 0.5); bd.add(a); a.add(cyl(0.12, 0.14, 0.8, steel, 0, 0, 0.3, 10)).rotation; a.children[0].rotation.x = Math.PI / 2;
      a.add(sph(0.38, acc, 0, 0, 0.8, 1, 0.8, 1.3)); R.parts.arms.push(a);
    }
    for (const s of [-1, 1]) { const st = cyl(0.04, 0.04, 0.5, steel, s * 0.4, 0.75, 0.6, 6); bd.add(st); bd.add(sph(0.13, eyeM, s * 0.4, 1.02, 0.62)); }
  } else { // tank
    R.parts.legs = [];
    for (const s of [-1, 1]) { const tr = rbox(0.55, 0.62, 1.9, blk, s * 0.85, 0.34, 0, 0.25); root.add(tr); for (let i = -2; i <= 2; i++) { const w = cyl(0.24, 0.24, 0.6, acc, s * 0.85, 0.34, i * 0.38, 12); w.rotation.z = Math.PI / 2; root.add(w); R.parts.legs.push(w); } }
    root.add(rbox(1.6, 0.62, 1.8, body, 0, 0.95, 0, 0.2));
    root.add(rbox(1.64, 0.14, 1.84, acc, 0, 0.7, 0, 0.05));
    const head = new THREE.Group(); head.position.y = 1.5; root.add(head); R.parts.head = head;
    head.add(mesh(new THREE.SphereGeometry(0.72, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), body, 0, 0, 0));
    head.add(rbox(0.95, 0.2, 0.12, blk, 0, 0.3, 0.56, 0.05), rbox(0.7, 0.09, 0.08, eyeM, 0, 0.3, 0.6, 0.03));
    head.add(cyl(0.03, 0.03, 0.5, steel, 0.35, 0.95, -0.2, 6), sph(0.08, eyeM, 0.35, 1.2, -0.2));
    R.parts.arms = [];
    for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 0.95, 1.5, 0.3); root.add(a); const c = cyl(0.17, 0.2, 0.9, steel, 0, 0, 0.3, 12); c.rotation.x = Math.PI / 2; a.add(c, sph(0.22, acc, 0, 0, 0.78)); R.parts.arms.push(a); }
  }
  g.scale.setScalar(spec.scale);
  enableShadows(g);

  /* مؤشر الاستهداف + شريط صحة الروبوت */
  const reticle = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.ringTex(), color: 0xff3b3b, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
  reticle.scale.setScalar(3.4); reticle.position.y = 1.7; reticle.renderOrder = 20; g.add(reticle); R.reticle = reticle;
  const bar = new THREE.Group(); bar.position.y = isBiped ? 3.6 : spec.type === 'hover' ? 3.5 : 2.9; g.add(bar); R.bar = bar;
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x2a0a0a, depthTest: false, transparent: true, opacity: 0.85 })); bg.scale.set(1.7, 0.2, 1); bg.renderOrder = 21;
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff3d3d, depthTest: false, transparent: true })); fill.scale.set(1.6, 0.12, 1); fill.renderOrder = 22;
  bar.add(bg, fill); bar.visible = false; R.fill = fill;
  R.center = () => new THREE.Vector3(0, isBiped ? 1.7 : spec.type === 'hover' ? 1.6 : 1.0, 0.2).multiplyScalar(spec.scale).applyMatrix4(g.matrixWorld);

  R.flash = (v) => { R.flashT = v; };
  R.update = function (dt, moving) {
    this.t += dt; const t = this.t, w = moving ? 1 : 0, th = this.threat;
    const P = this.parts;
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt * 4);
    for (const m of mats) { m.emissive.setHex(0xffffff); m.emissiveIntensity = this.flashT * 1.2; }
    this.eyeM.emissiveIntensity = 2 + Math.sin(t * 6) * 0.6 * th;
    if (isBiped) {
      root.position.y = Math.abs(Math.sin(t * 7)) * 0.08 * w + Math.sin(t * 2) * 0.02;
      P.legs[0].rotation.x = Math.sin(t * 7) * 0.5 * w; P.legs[1].rotation.x = -Math.sin(t * 7) * 0.5 * w;
      P.arms[0].rotation.x = -0.4 * th - 1.0 * th * (0.5 + 0.5 * Math.sin(t * 8)) * 0 + Math.sin(t * 7) * 0.5 * w * (1 - th);
      P.arms[1].rotation.x = -Math.sin(t * 7) * 0.5 * w * (1 - th) - 0.4 * th;
      P.arms[0].rotation.z = 0.35 * th + 0.15 + Math.sin(t * 9) * 0.2 * th; P.arms[1].rotation.z = -0.35 * th - 0.15 - Math.sin(t * 9) * 0.2 * th;
      P.head.rotation.z = Math.sin(t * 2.3) * 0.06;
    } else if (spec.type === 'hover') {
      P.bd.position.y = 1.7 + Math.sin(t * 3) * 0.14; P.prop.rotation.y += dt * 25; P.bd.rotation.z = Math.sin(t * 2) * 0.06 + 0.1 * w;
      P.arms[0].rotation.z = 0.4 + Math.sin(t * 5) * 0.25 * th; P.arms[1].rotation.z = -0.4 - Math.sin(t * 5) * 0.25 * th;
    } else if (spec.type === 'crab') {
      P.bd.position.y = 0.95 + Math.abs(Math.sin(t * 9)) * 0.06 * (w + th * 0.5);
      P.legs.forEach(l => { l.rotation.x = Math.sin(t * 12 + l.userData.i * 2 + (l.userData.s > 0 ? 1.6 : 0)) * 0.35 * (w + 0.2); });
      P.arms[0].rotation.y = 0.25 + Math.sin(t * 7) * 0.25 * th; P.arms[1].rotation.y = -0.25 - Math.sin(t * 7) * 0.25 * th;
    } else {
      root.position.y = Math.sin(t * 22) * 0.015 * (w + 0.4); P.head.rotation.y = Math.sin(t * 1.7) * 0.25 * (1 - w);
      P.legs.forEach(l => { l.rotation.x += dt * 5 * w; });
      P.arms[0].rotation.x = -0.1 * th + Math.sin(t * 9) * 0.1 * th; P.arms[1].rotation.x = P.arms[0].rotation.x;
    }
    this.reticle.material.rotation += dt * 1.4;
  };
  return R;
}
