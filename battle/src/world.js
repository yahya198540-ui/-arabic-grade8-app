import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

/* مواقع المواجهات: P = موقف الطالب، f = اتجاه نظر الكاميرا (الخلفية)، والروبوت يقف يمين الطالب على الشاشة */
export const ENC = [
  { P: [-4, 10],  f: [0, -1],      route: [[0, 26], [-4, 10]] },
  { P: [-26, -6], f: [1, 0],       route: [[-4, 10], [-26, -6]] },
  { P: [-12, -26], f: [0, -1],     route: [[-26, -6], [-12, -26]] },
  { P: [24, -18], f: [-1, 0],      route: [[-12, -26], [4, -20], [24, -18]] },
  { P: [28, 12],  f: [-0.707, -0.707], route: [[24, -18], [30, -2], [28, 12]] },
  { P: [0, -4],   f: [0.707, -0.707],  route: [[28, 12], [14, 4], [0, -4]] },
];
export const BOUND = 39;
export const SEP = 10;

let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const col = (c) => new THREE.Color(c);

export function buildWorld(scene, quality) {
  const W = { colliders: [], pads: [], flags: [], anim: [], clouds: [] };
  const high = quality === 'high';
  const stoneMap = T.castleWall();
  const wallMat = (rx, ry) => { const t = stoneMap.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, color: 0xfff3dc }); };
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xe4cfa0, roughness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 });
  const litMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.6) });

  /* ---------- السماء ---------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vP;void main(){float h=clamp(vP.y,0.,1.);vec3 c=mix(vec3(.80,.92,.98),vec3(.18,.52,.92),pow(h,.55));c=mix(vec3(.99,.9,.7),c,smoothstep(0.,.18,h));gl_FragColor=vec4(c,1.);}',
  }));
  scene.add(sky); W.sky = sky;
  const ctex = T.cloudTex(), cn = high ? 26 : 12;
  for (let i = 0; i < cn; i++) {
    const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex, fog: false, depthWrite: false, transparent: true, opacity: 0.55 + rnd() * 0.4 }));
    const a = rnd() * 6.28, r = 260 + rnd() * 260, w = 110 + rnd() * 140; c.scale.set(w, w * 0.42, 1); c.position.set(Math.cos(a) * r, 70 + rnd() * 90, Math.sin(a) * r);
    scene.add(c); W.clouds.push(c);
  }

  /* ---------- الأرض والساحة ---------- */
  const hash = (x, z) => { const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); };
  const vn = (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); return (hash(xi, zi) * (1 - u) + hash(xi + 1, zi) * u) * (1 - v) + (hash(xi, zi + 1) * (1 - u) + hash(xi + 1, zi + 1) * u) * v; };
  const fbm = (x, z, o = 5) => { let a = 0.5, f = 1, t = 0; for (let i = 0; i < o; i++) { t += a * vn(x * f, z * f); f *= 2.03; a *= 0.5; } return t; };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  {
    const TN = high ? 170 : 90, tg = new THREE.PlaneGeometry(1500, 1500, TN, TN); tg.rotateX(-Math.PI / 2);
    const p = tg.attributes.position, hs = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z * 0.92), m = sstep(130, 330, d);
      const ridge = 1 - Math.abs(2 * fbm(x * 0.0065 + 10, z * 0.0065) - 1);
      const h = m * (fbm(x * 0.004, z * 0.004) * 55 + ridge * ridge * 95) + (fbm(x * 0.02, z * 0.02) - 0.5) * 3 * sstep(46, 110, d) - 0.05;
      p.setY(i, h); hs[i] = h;
    }
    tg.computeVertexNormals(); const nn = tg.attributes.normal, cols = new Float32Array(p.count * 3);
    const cs = col(0xdcc48e), cr = col(0xa07a56), cd = col(0x7a5a40), ch = col(0xd8c4a0), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const h = hs[i], slope = 1 - nn.getY(i);
      c.copy(cs).lerp(cr, sstep(4, 36, h)).lerp(ch, sstep(60, 120, h)).lerp(cd, sstep(0.12, 0.5, slope) * 0.85);
      const nz = 0.92 + vn(p.getX(i) * 0.3, p.getZ(i) * 0.3) * 0.16; cols[i * 3] = c.r * nz; cols[i * 3 + 1] = c.g * nz; cols[i * 3 + 2] = c.b * nz;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const sm = T.sand(); sm.repeat.set(70, 70);
    const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: sm, vertexColors: true, roughness: 1 })); ground.receiveShadow = true; scene.add(ground);
  }
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(88, 88), new THREE.MeshStandardMaterial({ map: T.pavers(), roughness: 0.85 }));
  plaza.rotation.x = -Math.PI / 2; plaza.receiveShadow = true; scene.add(plaza);
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xcdb48a, roughness: 0.9 });
  for (const [x, z, w, d] of [[0, -44.5, 90, 1.4], [0, 44.5, 90, 1.4], [-44.5, 0, 1.4, 90], [44.5, 0, 1.4, 90]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d), curbMat); c.position.set(x, 0.3, z); c.receiveShadow = true; scene.add(c); }
  const med = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ map: T.medallion(), transparent: true, roughness: 0.7, depthWrite: false }));
  med.rotation.x = -Math.PI / 2; med.position.set(0, 0.03, -4); med.receiveShadow = true; scene.add(med);

  /* ---------- القلعة العُمانية ---------- */
  const merlons = [];
  const addMerlon = (x, y, z, ry, sx = 1.1) => merlons.push([x, y, z, ry, sx]);
  function tower(x, z, r, h, opts = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.93, r, h, 32, 1), wallMat(Math.round(r * 3), Math.round(h / 5)));
    body.position.y = h / 2; g.add(body);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.14, r * 0.96, 1.4, 32), sandMat); lip.position.y = h + 0.1; g.add(lip);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.1, r * 1.1, 0.2, 32), sandMat); top.position.y = h + 0.85; g.add(top);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 1.02, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0xb7772f, roughness: 0.8 })); band.position.y = h * 0.62; g.add(band);
    const n = Math.max(8, Math.round(2 * Math.PI * r * 1.1 / 1.7));
    for (let i = 0; i < n; i++) { const a = i / n * 6.283; addMerlon(x + Math.cos(a) * r * 1.08, h + 1.5, z + Math.sin(a) * r * 1.08, -a + Math.PI / 2, 1.0); }
    // نوافذ مقوّسة
    for (let k = 0; k < Math.round(r); k++) { const a = k / Math.round(r) * 6.283 + 0.4; for (const yy of [h * 0.35, h * 0.82]) { const wm = ((k + (yy > h * 0.5 ? 1 : 0)) % 2) ? litMat : darkMat; const wnd = new THREE.Mesh(new THREE.CircleGeometry(0.55, 10, 0, Math.PI), wm); const wb = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), wm); wnd.position.set(0, 0.5, 0); wb.position.set(0, 0, 0); const wg = new THREE.Group(); wg.add(wnd, wb); wg.position.set(Math.cos(a) * r * 0.985, yy, Math.sin(a) * r * 0.985); wg.rotation.y = -a + Math.PI / 2; g.add(wg); } }
    if (opts.cone) { const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.0, r * 1.2, 24), new THREE.MeshStandardMaterial({ color: 0xa5522c, roughness: 0.8 })); c.position.y = h + 1 + r * 0.6; g.add(c); }
    scene.add(g); return g;
  }
  function wall(x, z, len, h, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, h, 3), wallMat(Math.round(len / 7), Math.round(h / 6))); b.position.y = h / 2; g.add(b);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.2, 0.7, 3.5), sandMat); cap.position.y = h + 0.3; g.add(cap);
    const n = Math.floor(len / 2.2);
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const lx = -len / 2 + 1.1 + i * (len - 2.2) / (n - 1), lz = s * 1.4; addMerlon(x + Math.cos(rotY) * lx + Math.sin(rotY) * lz, h + 1.0, z - Math.sin(rotY) * lx + Math.cos(rotY) * lz, rotY, 1.0); }
    scene.add(g); return g;
  }
  const GZ = -47;
  // سور البوابة (فتحة في الوسط) وأبراج مستديرة على الطراز العُماني
  wall(-17, GZ, 22, 10); wall(17, GZ, 22, 10);
  wall(-52, GZ - 1, 34, 10); wall(52, GZ - 1, 34, 10);
  tower(-30, GZ - 1, 6.5, 18); tower(30, GZ - 1, 6.5, 18);
  tower(-8, GZ - 1, 3.2, 14); tower(8, GZ - 1, 3.2, 14);
  tower(-70, GZ - 2, 5, 14, { cone: false }); tower(70, GZ - 2, 5, 14);
  // قوس البوابة والباب الخشبي
  const arch = new THREE.Group(); arch.position.set(0, 0, GZ + 1.6);
  const doorW = 6.2, doorH = 7.4;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), new THREE.MeshStandardMaterial({ map: T.woodDoor(), roughness: 0.8 })); door.position.y = doorH / 2; arch.add(door);
  const arcTop = new THREE.Mesh(new THREE.CircleGeometry(doorW / 2, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x5a3216, roughness: 0.85 })); arcTop.position.y = doorH; arch.add(arcTop);
  const frameM = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.5, metalness: 0.4 });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(doorW / 2 + 0.25, 0.28, 8, 24, Math.PI), frameM); frame.position.y = doorH; arch.add(frame);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, doorH, 0.5), frameM); p.position.set(s * (doorW / 2 + 0.25), doorH / 2, 0); arch.add(p); }
  const gatehouse = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 4), wallMat(2, 1)); gatehouse.position.set(0, 12, GZ); scene.add(gatehouse);
  for (let i = 0; i < 6; i++) addMerlon(-5.5 + i * 2.2, 14.5, GZ + 1.5, 0, 1.0);
  scene.add(arch);
  // الحصن (القلعة الرئيسية خلف السور)
  const keep = new THREE.Mesh(new THREE.BoxGeometry(26, 26, 16), wallMat(4, 4)); keep.position.set(0, 13, GZ - 14); scene.add(keep);
  tower(-14, GZ - 14, 5, 30); tower(14, GZ - 14, 5, 30); tower(0, GZ - 22, 7, 38, { cone: false });
  // علم السلطنة على البرج الأيسر
  const flagTex = T.omanFlag();
  function flag(x, y, z, w, poleH, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, poleH, 8), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.7, roughness: 0.3 })); pole.position.y = poleH / 2; g.add(pole);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.6, roughness: 0.3 })); ball.position.y = poleH + 0.1; g.add(ball);
    const geo = new THREE.PlaneGeometry(w, w / 2, 20, 10); geo.translate(w / 2 + 0.1, 0, 0);
    const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 })); f.position.y = poleH - w / 4 - 0.3; f.castShadow = true; g.add(f);
    scene.add(g); W.flags.push({ geo, w, base: geo.attributes.position.array.slice(), ph: rnd() * 6 }); return g;
  }
  flag(-30, 19.4, GZ - 1, 8.5, 11);
  flag(30, 19.4, GZ - 1, 8.5, 11);
  flag(0, 38, GZ - 22, 7, 9);
  flag(-70, 15.4, GZ - 2, 5, 7); flag(70, 15.4, GZ - 2, 5, 7);
  // رايات صغيرة في الساحة
  for (const [x, z] of [[-12, 30], [12, 30], [-38, -14], [38, -2]]) { flag(x, 0, z, 3.4, 5.4, x > 0 ? Math.PI : 0); W.colliders.push({ x, z, r: 0.5 }); }

  // مدرج الحصون على التلال (يمين ويسار)
  function hill(x, z, r, h, c1, c2) {
    const geo = new THREE.ConeGeometry(r, h, 14, 6, true); const p = geo.attributes.position; const cols = [];
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = (y + h / 2) / h; if (t < 0.97) { const k = 1 + (rnd() - .5) * 0.3; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, y + (rnd() - .5) * h * 0.12); } else { p.setX(i, p.getX(i) + (rnd() - .5) * r * 0.25); p.setY(i, y - h * 0.08); } const c = col(c1).lerp(col(c2), Math.pow(t, 0.8)); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })); m.position.set(x, h / 2 - 0.5, z); scene.add(m); return m;
  }
  hill(92, -28, 52, 22, 0x8d6a4c, 0xcfb089); tower(92, -28, 4.2, 6); const hf = scene.children[scene.children.length - 1]; hf.position.y = 21;
  flag(92, 28, -28, 5, 8);
  hill(-96, -30, 46, 20, 0x8d6a4c, 0xcfb089); tower(-96, -30, 3.6, 5); scene.children[scene.children.length - 1].position.y = 19; flag(-96, 25, -30, 4.4, 7);
  // دوائر الحجارة المتناثرة (صخور صغيرة)
  const rockG = new THREE.IcosahedronGeometry(1, 0), rockM = new THREE.MeshStandardMaterial({ color: 0xa8845a, flatShading: true, roughness: 1 });
  const nr = high ? 40 : 18, rocks = new THREE.InstancedMesh(rockG, rockM, nr), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), ev = new THREE.Euler();
  for (let i = 0; i < nr; i++) { const a = rnd() * 6.28, r = 50 + rnd() * 60, s = 0.8 + rnd() * 2.2; ev.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(ev); mm.compose(new THREE.Vector3(Math.cos(a) * r, s * 0.4, Math.sin(a) * r), q, new THREE.Vector3(s, s * 0.7, s)); rocks.setMatrixAt(i, mm); }
  rocks.castShadow = true; scene.add(rocks);

  // الشرفات (المراكز) كلها في شبكة واحدة
  const mg = new THREE.BoxGeometry(1.1, 1.3, 0.9), mi = new THREE.InstancedMesh(mg, sandMat, merlons.length);
  merlons.forEach(([x, y, z, ry, sx], i) => { ev.set(0, ry, 0); q.setFromEuler(ev); mm.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, 1, 1)); mi.setMatrixAt(i, mm); });
  mi.castShadow = true; scene.add(mi);

  /* ---------- النخيل ---------- */
  function palmGeo() {
    const parts = [];
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 3.2, 0), new THREE.Vector3(0.9, 6.4, 0.2));
    const trunk = new THREE.TubeGeometry(curve, 8, 0.3, 8, false); const tc = []; const tp = trunk.attributes.position;
    for (let i = 0; i < tp.count; i++) { const k = (i % 2) ? 0.62 : 0.55; tc.push(0.45 * k + 0.3, 0.3 * k + 0.2, 0.15 * k + 0.1); }
    trunk.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3)); trunk.deleteAttribute('uv'); trunk.deleteAttribute('normal'); parts.push(trunk.toNonIndexed());
    const top = new THREE.Vector3(0.9, 6.4, 0.2);
    for (let f = 0; f < 10; f++) {
      const ang = f / 10 * 6.283 + rnd() * 0.3, L = 3.0 + rnd() * 0.8, pos = [], cl = [], idx = [];
      const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz, pz = dx, seg = 6, lift = 1.3 + rnd() * 0.5;
      for (let i = 0; i <= seg; i++) {
        const t = i / seg, w = 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.1)) * (1 - t * 0.35);
        const cx = top.x + dx * t * L, cz = top.z + dz * t * L, cy = top.y + lift * Math.sin(t * 1.6) - t * t * 1.9;
        pos.push(cx + px * w, cy - w * 0.3, cz + pz * w, cx - px * w, cy - w * 0.3, cz - pz * w, cx, cy + 0.04, cz);
        const gcol = col(0x2f8a3a).lerp(col(0x8bd45a), t * 0.8);
        for (let k = 0; k < 3; k++) cl.push(gcol.r, gcol.g, gcol.b);
        if (i < seg) { const a = i * 3, b = a + 3; idx.push(a, b, a + 2, a + 2, b, b + 2, a + 2, b + 2, a + 1, a + 1, b + 2, b + 1); }
      }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); fg.setIndex(idx); parts.push(fg.toNonIndexed());
    }
    const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
  }
  const palmPos = [];
  for (const z of [32, 16, 0, -16, -32]) { palmPos.push([-41.5, z + rnd() * 3], [41.5, z + rnd() * 3]); }
  for (const x of [-30, -15, 0, 15, 30]) palmPos.push([x + rnd() * 3, 42]);
  palmPos.push([-9, -43], [9, -43], [-22, -43], [22, -43]);
  for (let i = 0; i < (high ? 26 : 12); i++) { const a = rnd() * 6.28, r = 58 + rnd() * 50; palmPos.push([Math.cos(a) * r, Math.sin(a) * r * 0.9 - 8]); }
  const palms = new THREE.InstancedMesh(palmGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }), palmPos.length);
  palmPos.forEach(([x, z], i) => { const s = 0.95 + rnd() * 0.5; ev.set(0, rnd() * 6.28, 0); q.setFromEuler(ev); mm.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s)); palms.setMatrixAt(i, mm); if (Math.abs(x) < 46 && Math.abs(z) < 46) W.colliders.push({ x, z, r: 0.8 }); });
  palms.castShadow = true; scene.add(palms); W.palms = palms;

  /* ---------- الصناديق والحواجز ---------- */
  const crateMat = new THREE.MeshStandardMaterial({ map: T.crate(), roughness: 0.6, metalness: 0.2 });
  function crate(x, z, s = 1.8, ry = 0, y = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat); m.position.set(x, y + s / 2, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; scene.add(m); if (y === 0) W.colliders.push({ x, z, r: s * 0.78 }); }
  const barMat = new THREE.MeshStandardMaterial({ color: 0xd6c19a, roughness: 0.85 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffc61a, roughness: 0.6 });
  function barrier(x, z, len = 5, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, 1.3, 1.1), barMat); b.position.y = 0.65; g.add(b);
    const t = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.22, 1.2), stripeMat); t.position.y = 1.4; g.add(t);
    g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); scene.add(g);
    const n = Math.ceil(len / 1.6); for (let i = 0; i < n; i++) { const lx = -len / 2 + 0.8 + i * (len - 1.6) / Math.max(1, n - 1); W.colliders.push({ x: x + Math.cos(ry) * lx, z: z - Math.sin(ry) * lx, r: 0.95 }); }
  }
  crate(14, -8, 2, 0.3); crate(16.1, -8.6, 1.8, 0.8); crate(15, -8, 1.6, 0.1, 2);
  crate(-18, 18, 2, 0.5); crate(-20, 17, 1.8, 0.1); crate(-19, 19.6, 1.7, 1.0);
  crate(-10, -5, 1.9, 0.2); crate(-11.8, -4.2, 1.7, 0.6); crate(12, -12, 1.8, 0.3);
  crate(-22, -31, 2, 0.4); crate(-24.1, -30, 1.8, 0.9); crate(-23, -31, 1.6, 0.2, 2);
  crate(10, -31, 2, 0.1); crate(12, -32.5, 1.8, 0.6); crate(-2, -14, 1.8, 0.7);
  crate(33, -30, 2, 0.3); crate(31, -31.5, 1.8, 0.8); crate(-34, 20, 2, 0.2); crate(-33, 24, 1.8, 0.5);
  crate(34, 28, 2, 0.4); crate(32, 30, 1.8, 0.2); crate(20, 22, 1.8, 0.9);
  barrier(36, -12, 5, 1.57); barrier(-36, -10, 5, 1.57); barrier(16, 26, 5, 0.2); barrier(-8, 32, 5, -0.2);
  barrier(20, -2, 4, 0.6); barrier(-6, -12, 4, -0.5);


  /* ---------- رايات القلعة (كتاب مفتوح) وفوانيس مضيئة ---------- */
  const bt = T.banner();
  for (const [x, y, z, w] of [[-30, 9.5, GZ - 1 + 6.62, 3.2], [30, 9.5, GZ - 1 + 6.62, 3.2], [-19, 6.2, GZ + 1.55, 2.6], [19, 6.2, GZ + 1.55, 2.6], [-52, 6.2, GZ + 0.55, 2.6], [52, 6.2, GZ + 0.55, 2.6]]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 2), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.9, side: THREE.DoubleSide })); b.position.set(x, y, z); scene.add(b); W.anim.push((t) => { b.rotation.x = Math.sin(t * 1.3 + x) * 0.03; });
  }
  const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.6) }), halo = T.glow('255,190,90');
  for (const [x, y, z] of [[-3.7, 8.2, GZ + 1.8], [3.7, 8.2, GZ + 1.8], [-8.2, 5.2, GZ + 2.5], [8.2, 5.2, GZ + 2.5]]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), lampM); l.position.set(x, y, z); scene.add(l);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })); h.scale.setScalar(3.2); h.position.copy(l.position); scene.add(h);
  }

  /* ---------- أعمدة الحروف الذهبية المتوهجة (على غرار الصورة المرجعية) ---------- */
  W.letters = [];
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xcdb892, roughness: 0.85 }), ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.0, 2.6) });
  for (const [ch, x, z] of [['ض', -9, -37], ['ع', 9, -37], ['أ', 39, -4], ['ذ', -39, 0], ['ن', 22, 34], ['ك', -22, 34]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 1.1, 20), stoneM); ped.position.y = 0.55; ped.castShadow = ped.receiveShadow = true; g.add(ped);
    const rg = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 8, 28), ringM); rg.rotation.x = Math.PI / 2; rg.position.y = 1.12; g.add(rg);
    const lt = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.letterTex(ch), depthWrite: false, transparent: true })); lt.scale.setScalar(2.6); lt.position.y = 3.3; g.add(lt);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('255,200,80'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75 })); gl.scale.setScalar(5.2); gl.position.y = 3.3; g.add(gl);
    scene.add(g); W.colliders.push({ x, z, r: 1.3 }); W.letters.push({ lt, gl, ph: rnd() * 6 });
  }

  /* ---------- أعشاب وشجيرات على أطراف الساحة ---------- */
  {
    const n = high ? 700 : 250, gg = new THREE.ConeGeometry(0.16, 0.9, 5); gg.translate(0, 0.45, 0);
    const gm = new THREE.InstancedMesh(gg, new THREE.MeshStandardMaterial({ roughness: 0.9 }), n); const c = new THREE.Color();
    for (let i = 0; i < n; i++) { const e = rnd() * 4 - 1, side = rnd() * 4 | 0, t = rnd() * 96 - 48, bx = side < 2 ? t : (side === 2 ? -46.5 - e : 46.5 + e), bz = side < 2 ? (side === 0 ? -46.5 - e : 46.5 + e) : t; const s = 0.7 + rnd() * 1.5; ev.set((rnd() - .5) * 0.4, rnd() * 6, (rnd() - .5) * 0.4); q.setFromEuler(ev); mm.compose(new THREE.Vector3(bx, 0, bz), q, new THREE.Vector3(s, s * (0.8 + rnd() * 0.8), s)); gm.setMatrixAt(i, mm); c.setHSL(0.22 + rnd() * 0.08, 0.55, 0.28 + rnd() * 0.16); gm.setColorAt(i, c); }
    gm.castShadow = true; scene.add(gm);
  }

  /* ---------- منصات الطاقة عند مواقع المواجهات ---------- */
  const glowTex = T.glow('90,230,255');
  ENC.forEach((e, i) => {
    const g = new THREE.Group(); g.position.set(e.P[0], 0.06, e.P[1]);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), new THREE.MeshBasicMaterial({ color: 0x35e6ff, transparent: true, opacity: 0.22, depthWrite: false })); disc.rotation.x = -Math.PI / 2; g.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.0, 40), new THREE.MeshBasicMaterial({ color: 0x9ff4ff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 7, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x35e6ff, transparent: true, opacity: 0.025, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); beam.position.y = 3.5; g.add(beam);
    scene.add(g); W.pads.push({ g, disc, ring, beam });
  });

  /* ---------- منصة التتويج والكأس (تظهر في شاشة الانتصار) ---------- */
  const V = new THREE.Group(); V.position.set(0, 0, -4); V.visible = false; scene.add(V); W.victory = V;
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc93c, roughness: 0.25, metalness: 0.85, emissive: 0x7a4a00, emissiveIntensity: 0.35 });
  const step1 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0x2b5fb8, roughness: 0.5 })); step1.position.y = 0.25; V.add(step1);
  const step2 = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 })); step2.position.y = 0.75; V.add(step2);
  const trophy = new THREE.Group(); trophy.position.set(0, 1.0, 0); V.add(trophy);
  const cupPts = [[0.01, 0], [1.0, 0], [1.0, 0.2], [0.55, 0.35], [0.22, 0.55], [0.2, 1.05], [0.5, 1.2], [0.4, 1.4], [0.9, 2.3], [1.15, 3.0], [1.1, 3.15], [0.96, 3.1], [0.01, 3.05]].map(p => new THREE.Vector2(p[0], p[1]));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 36), gold); cup.scale.setScalar(0.9); trophy.add(cup);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 10, 24, Math.PI * 1.3), gold); h.position.set(s * 0.95, 2.45, 0); h.rotation.z = s > 0 ? -Math.PI * 0.65 : -Math.PI * 0.35 - Math.PI * 0.0; h.rotation.z = s > 0 ? -1.0 : Math.PI + 1.0; trophy.add(h); }
  const tstar = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0xffd24a, emissiveIntensity: 1.5, roughness: 0.2 })); tstar.position.y = 3.5; trophy.add(tstar);
  W.trophy = trophy; W.tstar = tstar;
  const vlight = new THREE.PointLight(0xffe6a0, 0, 30); vlight.position.set(0, 6, 3); V.add(vlight); W.vlight = vlight;

  /* ---------- حركة البيئة ---------- */
  W.update = (t, dt) => {
    for (const f of W.flags) { const p = f.geo.attributes.position, b = f.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3] / f.w; p.setZ(i, Math.sin(x * 7 - t * 3.2 + f.ph) * 0.28 * x * f.w * 0.16 + Math.sin(x * 12 - t * 5) * 0.05 * x); p.setY(i, b[i * 3 + 1] + Math.sin(x * 5 - t * 2.6 + f.ph) * 0.05 * x); } p.needsUpdate = true; f.geo.computeVertexNormals(); }
    W.clouds.forEach((c, i) => { c.position.x += dt * (1.2 + i % 3 * 0.4); if (c.position.x > 560) c.position.x = -560; });
    W.pads.forEach((p, i) => { const k = 0.5 + 0.5 * Math.sin(t * 3 + i); p.ring.material.opacity = 0.55 + k * 0.4; p.disc.material.opacity = 0.2 + k * 0.2; });
    W.anim.forEach(f => f(t)); W.letters.forEach(l => { l.lt.position.y = 3.3 + Math.sin(t * 2 + l.ph) * 0.18; l.gl.position.y = l.lt.position.y; l.gl.material.opacity = 0.6 + 0.2 * Math.sin(t * 3 + l.ph); });
    W.trophy.rotation.y = t * 0.9; W.tstar.rotation.y = -t * 2; W.tstar.position.y = 3.5 + Math.sin(t * 3) * 0.1;
  };
  return W;
}

/* دفع الكائن خارج الحواجز (تصادم دائري بسيط) */
export function collide(pos, radius, colliders) {
  for (let it = 0; it < 2; it++) for (const c of colliders) {
    const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + radius;
    if (d < m && d > 1e-4) { pos.x = c.x + dx / d * m; pos.z = c.z + dz / d * m; }
  }
  pos.x = Math.max(-BOUND, Math.min(BOUND, pos.x)); pos.z = Math.max(-BOUND, Math.min(BOUND, pos.z));
}
