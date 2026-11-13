import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as T from './textures.js';

/* شخصيات بشرية حقيقية (نموذج GLB بهيكل عظمي وحركات) — الطالب العُماني والأشرار */
const V3 = THREE.Vector3, Q = THREE.Quaternion;
const M = (color, rough = 0.55, metal = 0, em = 0x000000, emI = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: em, emissiveIntensity: emI });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const sph = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = mesh(new THREE.SphereGeometry(r, 24, 16), mat, x, y, z); m.scale.set(sx, sy, sz); return m; };
const rbox = (w, h, d, mat, x, y, z, r = 0.05) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z);
const cyl = (rt, rb, h, mat, x, y, z, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
const ease = (t) => t * t * (3 - 2 * t);

const BONES = { hips: 'Hips', spine2: 'Spine2', head: 'Head', rArm: 'RightArm', rFore: 'RightForeArm', rHand: 'RightHand', rMid: 'RightHandMiddle1', lArm: 'LeftArm', lFore: 'LeftForeArm', lHand: 'LeftHand', lMid: 'LeftHandMiddle1', neck: 'Neck' };

/* يوجّه عظمة نحو اتجاه عالمي (بدون معرفة محاورها) */
const _a = new V3(), _b = new V3(), _q1 = new Q(), _q2 = new Q(), _q3 = new Q();
function pointBone(b, child, dir, w) {
  if (w <= 0.001) return;
  b.updateWorldMatrix(true, false); child.updateWorldMatrix(true, false);
  b.getWorldPosition(_a); child.getWorldPosition(_b); _b.sub(_a).normalize();
  _q1.setFromUnitVectors(_b, dir); b.getWorldQuaternion(_q2); _q1.multiply(_q2);
  b.parent.getWorldQuaternion(_q3); _q3.invert().multiply(_q1);
  b.quaternion.slerp(_q3, w); b.updateMatrixWorld(true);
}

function base(gltf, tint) {
  const holder = new THREE.Group(), root = new THREE.Group(); holder.add(root);
  const model = skClone(gltf.scene); root.add(model);
  const mats = [];
  model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; o.material = o.material.clone(); mats.push(o.material); if (tint) tint(o.material, o); } });
  const bones = {}; for (const [k, n] of Object.entries(BONES)) bones[k] = model.getObjectByName('mixamorig' + n) || model.getObjectByName('mixamorig:' + n);
  const mixer = new THREE.AnimationMixer(model), act = {};
  gltf.animations.forEach(c => { act[c.name] = mixer.clipAction(c); act[c.name].play(); act[c.name].weight = 0; });
  return { holder, root, model, mats, bones, mixer, act, cur: null, follow: [] };
}
function setAnim(B, name, ts = 1) {
  if (B.cur !== name) { B.cur = name; }
  for (const [n, a] of Object.entries(B.act)) { const target = n === name ? 1 : 0; a.weight += (target - a.weight) * 0.18; if (n === name) a.timeScale = ts; }
}
/* يربط جسمًا بعظمة (يتبع حركتها) — الإحداثيات بالمتر داخل holder */
function attach(B, boneKey, obj, pos, rot, scale = 1) { obj.userData.att = { bone: B.bones[boneKey], pos, rot: new Q().setFromEuler(new THREE.Euler(...rot)), scale }; B.holder.add(obj); B.follow.push(obj); }
const _m = new THREE.Matrix4(), _p = new V3(), _s = new V3(), _qq = new Q();
function applyFollow(B) {
  B.holder.updateMatrixWorld(true); const inv = _m.copy(B.holder.matrixWorld).invert();
  for (const o of B.follow) {
    const a = o.userData.att; a.bone.updateWorldMatrix(true, false);
    const bm = a.bone.matrixWorld.clone().premultiply(inv); bm.decompose(_p, _qq, _s);
    o.position.copy(_p).add(new V3(...a.pos).applyQuaternion(_qq)); o.quaternion.copy(_qq).multiply(a.rot); o.scale.setScalar(a.scale);
  }
}

/* مدفع: السبطانة على محور +Y */
function buildGun(accent, dark = 0x232b38, body = 0xe8eef6, trim = 0x2a62d6) {
  const g0 = new THREE.Group(), glow = M(accent, 0.3, 0, accent, 2.4), gb = M(body, 0.3, 0.35), gd = M(dark, 0.4, 0.5), tr = M(trim, 0.35, 0.25);
  g0.add(rbox(0.17, 0.56, 0.24, gb, 0, -0.2, 0), rbox(0.2, 0.2, 0.28, tr, 0, -0.12, 0));
  g0.add(cyl(0.07, 0.085, 0.52, gd, 0, -0.68, 0, 14));
  for (let i = 0; i < 3; i++) { const ring = mesh(new THREE.TorusGeometry(0.095, 0.02, 8, 18), glow, 0, -0.5 - i * 0.15, 0); ring.rotation.x = Math.PI / 2; g0.add(ring); }
  g0.add(cyl(0.12, 0.07, 0.1, glow, 0, -0.96, 0, 16), rbox(0.1, 0.34, 0.1, gd, 0, 0.0, 0.14, 0.03), rbox(0.1, 0.12, 0.34, gd, 0, -0.34, -0.2, 0.03), rbox(0.12, 0.3, 0.12, glow, 0, -0.1, -0.16, 0.03));
  g0.rotation.z = Math.PI; g0.position.y = -0.12;
  const gun = new THREE.Group(); gun.add(g0); g0.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 1.04, 0); g0.add(muzzle); muzzle.position.set(0, -1.04, 0); // قبل الدوران
  const mf = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('255,255,255'), color: accent, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); mf.scale.setScalar(1.8); muzzle.add(mf);
  return { gun, muzzle, mf };
}

/* ======= رأس الطالب العُماني (وجه مرسوم + كمّة) ======= */
function omaniHead() {
  const head = new THREE.Group(), hm = new THREE.MeshStandardMaterial({ map: T.face(), roughness: 0.62 }), skin = M(0xcf9560, 0.65), dark = M(0x17120f, 0.6), white = M(0xfbf9f3, 0.8);
  head.add(sph(0.47, hm, 0, 0, 0, 1, 1.02, 0.97), sph(0.05, M(0xc0804f, 0.6), 0, -0.07, 0.46, 1, 0.9, 1.1));
  for (const s of [-1, 1]) head.add(sph(0.1, skin, s * 0.47, -0.02, -0.02, 0.6, 1, 1));
  head.add(mesh(new THREE.SphereGeometry(0.485, 28, 16, Math.PI, Math.PI, 0, Math.PI * 0.85), dark, 0, 0, -0.02));
  const cap = mesh(new THREE.CylinderGeometry(0.34, 0.47, 0.36, 32, 1, true), new THREE.MeshStandardMaterial({ map: T.kuma(), roughness: 0.9, side: THREE.DoubleSide }), 0, 0.38, -0.03); cap.rotation.x = -0.1; head.add(cap);
  const top = cyl(0.34, 0.34, 0.025, white, 0, 0.565, -0.05, 32); top.rotation.x = -0.1; head.add(top);
  const rim = mesh(new THREE.TorusGeometry(0.455, 0.022, 6, 32), M(0x2a4fb0, 0.7), 0, 0.21, -0.02); rim.rotation.x = Math.PI / 2 - 0.1; head.add(rim);
  head.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return head;
}

/* ======================= الطالب ======================= */
export function makePlayer(gltf) {
  const B = base(gltf, (m) => { m.color.set(0xffffff); m.emissive = new THREE.Color(0xdfe8ff); m.emissiveMap = m.map; m.emissiveIntensity = 0.55; m.metalness = 0.1; m.roughness = 0.65; });
  const root = B.root;
  // الثوب العُماني الأبيض
  const pts = [[0.01, 0.1], [0.43, 0.1], [0.41, 0.3], [0.35, 0.6], [0.29, 0.85], [0.24, 1.02], [0.01, 1.04]].map(p => new THREE.Vector2(p[0], p[1]));
  const thobe = mesh(new THREE.LatheGeometry(pts, 28), new THREE.MeshStandardMaterial({ color: 0xfbf9f3, roughness: 0.85, side: THREE.DoubleSide })); thobe.scale.z = 0.85; thobe.castShadow = true; root.add(thobe);
  const sash = mesh(new THREE.TorusGeometry(0.255, 0.035, 8, 28), M(0x6a4a2a, 0.7), 0, 1.0, 0); sash.rotation.x = Math.PI / 2; sash.scale.set(1, 0.85, 1); root.add(sash);
  const khanjar = new THREE.Group(); const kb = mesh(new THREE.TorusGeometry(0.12, 0.028, 6, 14, Math.PI * 0.9), M(0xd4af37, 0.3, 0.8), 0, 0, 0); kb.rotation.z = Math.PI * 0.55; khanjar.add(kb); khanjar.position.set(0, 0.96, 0.24); root.add(khanjar);
  // رأس الطالب بدل الخوذة
  const head = omaniHead(); head.scale.setScalar(0.3); attach(B, 'head', head, [0, 0.09, 0.015], [0, Math.PI, 0]);
  // مدفع الطاقة بيد اليمنى
  const G = buildGun(0x35e6ff); G.gun.scale.setScalar(0.62); attach(B, 'rHand', G.gun, [0, 0.09, 0.0], [0, 0, 0]);
  const bp = new THREE.Group(); bp.add(rbox(0.3, 0.4, 0.14, M(0x39434f, 0.45, 0.3), 0, 0, 0, 0.04), rbox(0.05, 0.3, 0.15, M(0x35e6ff, 0.3, 0, 0x35e6ff, 2.2), -0.1, 0, 0.0, 0.02), rbox(0.05, 0.3, 0.15, M(0x35e6ff, 0.3, 0, 0x35e6ff, 2.2), 0.1, 0, 0.0, 0.02));
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), new THREE.MeshBasicMaterial({ map: T.letterTex('ض'), transparent: true })); badge.position.z = -0.075; badge.rotation.y = Math.PI; bp.add(badge); bp.traverse(o => { if (o.isMesh) o.castShadow = true; });
  attach(B, 'spine2', bp, [0, 0.05, -0.19], [0, 0, 0]);
  const P = {
    group: B.holder, headObj: head, t: 0, aim: 0, hurt: 0, cheer: 0, recoil: 0, flashT: 0, aimAt: null, muzzle: G.muzzle, speedK: 0,
    kick() { this.recoil = 1; this.flashT = 1; },
    update(dt, speed) {
      this.t += dt; const t = this.t; this.recoil *= Math.pow(0.0008, dt); this.flashT = Math.max(0, this.flashT - dt * 9); G.mf.material.opacity = this.flashT; G.mf.material.rotation = t * 20;
      this.speedK += ((speed > 0.2 ? 1 : 0) - this.speedK) * Math.min(1, dt * 10);
      setAnim(B, speed > 0.2 ? 'Run' : 'Idle', clampN(speed / 7.2, 0.6, 1.5));
      B.mixer.update(dt);
      B.root.position.y = this.cheer * Math.abs(Math.sin(t * 7)) * 0.35; B.root.rotation.x = -this.hurt * 0.25 - this.recoil * 0.05; thobe.rotation.x = Math.sin(t * 9) * 0.05 * this.speedK; thobe.rotation.z = Math.sin(t * 4.5) * 0.04 * this.speedK;
      // وضع التصويب: ذراعان نحو الهدف (أو إلى الأمام أثناء الجري)
      B.holder.updateMatrixWorld(true);
      const fwd = new V3(0, 0, 1).applyQuaternion(B.holder.getWorldQuaternion(new Q())), bs = B.bones;
      let dir; if (this.cheer > 0.5) dir = new V3(0.15, 1, 0.1).normalize(); else if (this.aimAt && this.aim > 0.05) { const h = new V3(); bs.rHand.getWorldPosition(h); dir = this.aimAt.clone().sub(h).normalize(); } else dir = fwd.clone().add(new V3(0, -0.28, 0)).normalize();
      const w = Math.max(this.cheer, this.aim, 0.75 * (1 - this.speedK * 0.0) * 1);
      pointBone(bs.rArm, bs.rFore, dir, w); pointBone(bs.rFore, bs.rHand, dir, w); pointBone(bs.rHand, bs.rMid, dir, w);
      const gp = new V3(); G.gun.getWorldPosition(gp); const la = new V3(); bs.lArm.getWorldPosition(la);
      const ldir = this.cheer > 0.5 ? new V3(-0.15, 1, 0.1).normalize() : gp.clone().addScaledVector(dir, 0.35).sub(la).normalize();
      pointBone(bs.lArm, bs.lFore, ldir, w); pointBone(bs.lFore, bs.lHand, ldir, w);
      bs.head.scale.setScalar(0.001);
      applyFollow(B);
    },
  };
  P.group.traverse(() => { }); return P;
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/* ======================= الأشرار ======================= */
export const VILLAIN_SPECS = [
  { name: 'الشرير المقنّع', tint: 0x6b6f78, visor: 0xff2d2d, scale: 1.0, rimc: 0xff3b3b },
  { name: 'الحارس الغادر', tint: 0x7a3030, visor: 0xff8a2d, scale: 1.0, rimc: 0xff7a2d },
  { name: 'المتسلل الأخضر', tint: 0x355a3c, visor: 0x7dff6a, scale: 1.0, rimc: 0x7dff6a },
  { name: 'المدمّر الأحمر', tint: 0x8a2222, visor: 0xff3030, scale: 1.1, rimc: 0xff3030 },
  { name: 'القائد الأسود', tint: 0x26262e, visor: 0xc05cff, scale: 1.1, rimc: 0xc05cff },
  { name: 'زعيم الأشرار', tint: 0x2b2118, visor: 0xffd23a, scale: 1.3, rimc: 0xffd23a, boss: true },
];
export const MINION_SPECS = [
  { name: 'رجل عصابة', tint: 0x5a5f6a, visor: 0xff3b3b, scale: 0.88, rimc: 0xff3b3b },
  { name: 'رجل عصابة', tint: 0x4a3a5e, visor: 0xff7bf2, scale: 0.86, rimc: 0xff7bf2 },
];

export function makeVillain(gltf, spec) {
  const vc = new THREE.Color(spec.visor);
  const B = base(gltf, (m, o) => {
    if (o.name.includes('visor')) { m.color.set(0x111111); m.emissive = vc.clone(); m.emissiveMap = null; m.emissiveIntensity = 1.6; }
    else { m.color.set(spec.tint); m.metalness = 0.35; m.roughness = 0.55; }
  });
  const root = B.root, mats = B.mats;
  const G = buildGun(spec.visor, 0x15161c, 0x2a2c33, 0x3a3d46); G.gun.scale.setScalar(0.62); attach(B, 'rHand', G.gun, [0, 0.09, 0], [0, 0, 0]);
  if (spec.boss) { const crown = mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.1, 8), M(0xffe27a, 0.3, 0.8, 0xaa7700, 0.5), 0, 0, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; crown.add(mesh(new THREE.ConeGeometry(0.03, 0.12, 6), M(0xffe27a, 0.3, 0.8, 0xaa7700, 0.5), Math.cos(a) * 0.115, 0.1, Math.sin(a) * 0.115)); } crown.traverse(o => { if (o.isMesh) o.castShadow = true; }); attach(B, 'head', crown, [0, 0.2, 0.0], [0, 0, 0]);
    const cape = mesh(new THREE.PlaneGeometry(0.7, 1.2, 1, 6), new THREE.MeshStandardMaterial({ color: 0x8a1020, side: THREE.DoubleSide, roughness: 0.9 }), 0, -0.55, 0); const cg = new THREE.Group(); cg.add(cape); cg.rotation.x = 0.1; attach(B, 'spine2', cg, [0, 0.1, -0.2], [0, 0, 0]); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('255,255,255'), color: spec.visor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 })); halo.scale.setScalar(0.7); attach(B, 'head', halo, [0, 0.1, 0.12], [0, 0, 0]);
  const R = { group: B.holder, root, mats, type: 'villain', t: Math.random() * 6, threat: 0, flashT: 0, spec, aimAt: null, fireT: 0, spawnT: 0 };
  const sc = spec.scale; B.holder.scale.setScalar(sc);
  const reticle = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.ringTex(), color: 0xff3b3b, transparent: true, depthTest: false, depthWrite: false, opacity: 0 })); reticle.scale.setScalar(3.0 / sc); reticle.position.y = 1.2; reticle.renderOrder = 20; B.holder.add(reticle); R.reticle = reticle;
  const bar = new THREE.Group(); bar.position.y = 2.25; B.holder.add(bar); R.bar = bar; bar.scale.setScalar(1 / sc);
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x2a0a0a, depthTest: false, transparent: true, opacity: 0.85 })); bg.scale.set(1.7, 0.2, 1); bg.renderOrder = 21;
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff3d3d, depthTest: false, transparent: true })); fill.scale.set(1.6, 0.12, 1); fill.renderOrder = 22; bar.add(bg, fill); bar.visible = false; R.fill = fill;
  R.center = () => new V3(0, 1.25, 0).multiplyScalar(sc).applyMatrix4(B.holder.matrixWorld);
  R.flash = (v) => { R.flashT = v; };
  R.fire = () => { R.fireT = 1; };
  R.update = function (dt, moving) {
    this.t += dt; this.flashT = Math.max(0, this.flashT - dt * 4); this.fireT = Math.max(0, this.fireT - dt * 8); G.mf.material.opacity = this.fireT;
    mats.forEach(m => { if (m.emissiveMap === null && m.emissive && m.color.getHex() === 0x111111) return; });
    B.mats.forEach(m => { if (!m.userData.v) { m.userData.v = 1; m.userData.e = m.emissive.clone(); m.userData.i = m.emissiveIntensity; } m.emissive.copy(m.userData.e).lerp(new THREE.Color(0xffffff), this.flashT); m.emissiveIntensity = m.userData.i + this.flashT * 1.2; });
    halo.material.opacity = 0.5 + 0.2 * Math.sin(this.t * 5) + 0.25 * this.threat;
    setAnim(B, moving ? 'Run' : 'Idle', moving ? 0.95 : 1);
    B.mixer.update(dt);
    const w = Math.max(0.0, Math.min(1, this.threat * 1.2)) * 0.85;
    if (w > 0.02 && this.aimAt) {
      B.holder.updateMatrixWorld(true); const bs = B.bones, h = new V3(); bs.rHand.getWorldPosition(h); const dir = this.aimAt.clone().sub(h).normalize();
      pointBone(bs.rArm, bs.rFore, dir, w); pointBone(bs.rFore, bs.rHand, dir, w); pointBone(bs.rHand, bs.rMid, dir, w);
      const gp = new V3(), la = new V3(); G.gun.getWorldPosition(gp); bs.lArm.getWorldPosition(la); const ld = gp.clone().addScaledVector(dir, 0.35).sub(la).normalize(); pointBone(bs.lArm, bs.lFore, ld, w); pointBone(bs.lFore, bs.lHand, ld, w);
    }
    this.muzzle = G.muzzle; this.reticle.material.rotation += dt * 1.4;
    applyFollow(B);
  };
  R.muzzle = G.muzzle;
  return R;
}
