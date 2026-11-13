import * as THREE from 'three';
/* كل الخامات تُرسم برمجيًّا على Canvas — لا ملفات خارجية */
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rep = 0, aniso = 4) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); } return t;
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function pavers() {
  const [c, g] = cv(512, 512); g.fillStyle = '#c9b48f'; g.fillRect(0, 0, 512, 512);
  const n = 4, s = 512 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const l = 58 + rnd() * 8; g.fillStyle = `hsl(36 ${34 + rnd() * 10}% ${l}%)`;
    g.beginPath(); g.roundRect(x * s + 5, y * s + 5, s - 10, s - 10, 14); g.fill();
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x * s + 12, y * s + 8, s - 28, 5);
    g.fillStyle = 'rgba(90,60,30,.10)'; for (let k = 0; k < 9; k++) g.fillRect(x * s + 12 + rnd() * (s - 30), y * s + 14 + rnd() * (s - 30), 6 + rnd() * 10, 3);
  }
  return tex(c, 22);
}
export function sand() {
  const [c, g] = cv(256, 256); g.fillStyle = '#d9bf86'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${150 + rnd() * 70},${120 + rnd() * 50},${60 + rnd() * 40},.18)`; g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 5, 2 + rnd() * 3); }
  return tex(c, 40);
}
export function castleWall() {
  const [c, g] = cv(512, 512); g.fillStyle = '#e4cfa0'; g.fillRect(0, 0, 512, 512);
  const rows = 8, rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * 32; const bw = 64;
    for (let x = -1; x < 9; x++) {
      const px = x * bw + off; g.fillStyle = `hsl(38 ${42 + rnd() * 12}% ${72 + rnd() * 8}%)`;
      g.beginPath(); g.roundRect(px + 2, r * rh + 2, bw - 4, rh - 4, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(px + 5, r * rh + 4, bw - 12, 3);
      g.fillStyle = 'rgba(120,80,40,.10)'; g.fillRect(px + 4, r * rh + rh - 9, bw - 8, 5);
    }
  }
  return tex(c, 1, 8);
}
export function crate() {
  const [c, g] = cv(256, 256); g.fillStyle = '#6f7a86'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#8d99a6'; g.fillRect(14, 14, 228, 228);
  g.strokeStyle = '#4a535d'; g.lineWidth = 8; g.strokeRect(14, 14, 228, 228);
  g.save(); g.beginPath(); g.rect(14, 14, 228, 228); g.clip();
  g.lineWidth = 10; g.strokeStyle = '#3f4650'; g.beginPath(); g.moveTo(0, 20); g.lineTo(236, 256); g.moveTo(20, 0); g.lineTo(256, 236); g.stroke(); g.restore();
  // شريط تحذير أصفر وأسود
  for (let i = -2; i < 14; i++) { g.fillStyle = i % 2 ? '#ffc61a' : '#2b2f35'; g.beginPath(); g.moveTo(i * 20, 0); g.lineTo(i * 20 + 20, 0); g.lineTo(i * 20 + 8, 22); g.lineTo(i * 20 - 12, 22); g.fill(); }
  g.fillStyle = '#ffc61a'; for (const [x, y] of [[30, 40], [226, 40], [30, 226], [226, 226]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
  return tex(c);
}
export function woodDoor() {
  const [c, g] = cv(256, 384); g.fillStyle = '#6b3f1e'; g.fillRect(0, 0, 256, 384);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = x % 64 ? '#7b4a26' : '#69391a'; g.fillRect(x + 2, 0, 28, 384); }
  g.fillStyle = '#c9a24b'; for (let y = 24; y < 384; y += 48) for (let x = 16; x < 256; x += 64) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  g.fillStyle = '#3a3f45'; g.fillRect(0, 70, 256, 12); g.fillRect(0, 300, 256, 12);
  g.strokeStyle = '#d4af37'; g.lineWidth = 10; g.beginPath(); g.arc(128, 200, 28, 0, 7); g.stroke();
  return tex(c);
}
/* علم سلطنة عُمان: أبيض فأحمر فأخضر أفقيًّا، وشريط أحمر رأسي عند السارية، والشعار الأبيض في الأعلى */
export function omanFlag() {
  const [c, g] = cv(768, 384); const W = 768, H = 384, band = W * 0.25;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H / 3);
  g.fillStyle = '#db161b'; g.fillRect(0, H / 3, W, H / 3);
  g.fillStyle = '#008000'; g.fillRect(0, 2 * H / 3, W, H / 3 + 1);
  g.fillStyle = '#db161b'; g.fillRect(0, 0, band, H);
  // الشعار: خنجر في غمد منحنٍ وسيفان متقاطعان
  g.save(); g.translate(band / 2, H * 0.30); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round';
  g.lineWidth = 7;
  for (const s of [-1, 1]) { g.save(); g.rotate(s * 0.62); g.beginPath(); g.moveTo(0, -62); g.lineTo(0, 64); g.stroke(); g.fillRect(-15, 40, 30, 8); g.beginPath(); g.arc(0, 62, 8, 0, 7); g.fill(); g.restore(); }
  g.lineWidth = 9; g.beginPath(); g.moveTo(-34, 20); g.quadraticCurveTo(0, 62, 34, 20); g.stroke(); // الحزام
  g.beginPath(); g.moveTo(-9, -30); g.quadraticCurveTo(0, 58, 18, 54); g.quadraticCurveTo(26, 40, 9, -30); g.closePath(); g.fillStyle = '#fff'; g.fill(); // غمد الخنجر
  g.fillStyle = '#db161b'; g.beginPath(); g.arc(0, -34, 6, 0, 7); g.fill();
  g.restore();
  return tex(c);
}
/* غطاء الرأس العُماني «الكمّة»: أبيض بزخارف زرقاء */
export function kuma() {
  const [c, g] = cv(512, 128); g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#2a4fb0'; g.fillStyle = '#2a4fb0'; g.lineWidth = 3;
  for (let x = 0; x < 512; x += 32) {
    g.beginPath(); g.moveTo(x + 16, 14); g.lineTo(x + 28, 40); g.lineTo(x + 16, 66); g.lineTo(x + 4, 40); g.closePath(); g.stroke();
    g.beginPath(); g.arc(x + 16, 40, 4, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x + 16, 82); g.lineTo(x + 24, 98); g.lineTo(x + 16, 114); g.lineTo(x + 8, 98); g.closePath(); g.fill();
  }
  g.fillRect(0, 70, 512, 4); g.fillRect(0, 6, 512, 4); g.fillRect(0, 120, 512, 6);
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return t;
}
export function medallion() {
  const [c, g] = cv(1024, 1024); g.clearRect(0, 0, 1024, 1024); g.translate(512, 512);
  const ring = (r, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); };
  g.fillStyle = 'rgba(30,70,140,.55)'; g.beginPath(); g.arc(0, 0, 470, 0, 7); g.fill();
  ring(470, 16, '#f2c14e'); ring(440, 5, '#fff3c4'); ring(300, 8, '#f2c14e');
  g.fillStyle = 'rgba(255,225,130,.9)';
  const star = (R, r, n, rot) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, d = i % 2 ? r : R; g.lineTo(Math.cos(a) * d, Math.sin(a) * d); } g.closePath(); };
  star(420, 300, 8, 0); g.fillStyle = 'rgba(244,200,80,.55)'; g.fill();
  star(300, 190, 8, Math.PI / 8); g.fillStyle = 'rgba(255,245,200,.7)'; g.fill();
  ring(120, 10, '#f2c14e'); g.fillStyle = 'rgba(40,90,170,.7)'; g.beginPath(); g.arc(0, 0, 110, 0, 7); g.fill();
  return tex(c);
}
export function glow(color = '255,255,255') {
  const [c, g] = cv(64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(.35, `rgba(${color},.55)`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
export function ringTex() {
  const [c, g] = cv(256, 256); g.translate(128, 128); g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 100, 0, 7); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 70, 0, 7); g.stroke();
  for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2); g.lineWidth = 8; g.beginPath(); g.moveTo(0, -126); g.lineTo(0, -80); g.stroke(); g.restore(); }
  return new THREE.CanvasTexture(c);
}
export function star(color = '#ffd84a') {
  const [c, g] = cv(64, 64); g.translate(32, 32); g.fillStyle = color; g.strokeStyle = '#fff6c8'; g.lineWidth = 3; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? 11 : 27; g.lineTo(Math.cos(a) * d, Math.sin(a) * d); } g.closePath(); g.fill(); g.stroke();
  return new THREE.CanvasTexture(c);
}
