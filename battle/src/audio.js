/* صوت إجرائي (WebAudio): مؤثرات كرتونية + موسيقى خلفية أصلية خفيفة — دون أي ملفات خارجية */
let ctx = null, master, sfxBus, musBus, noiseBuf;
let sfxOn = true, musicOn = true, musicRunning = false, step = 0, nextT = 0, timer = 0;

export function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.55 : 0; sfxBus.connect(master);
  musBus = ctx.createGain(); musBus.gain.value = musicOn ? 0.16 : 0; musBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export const isSfx = () => sfxOn;
export const isMusic = () => musicOn;
export function setSfx(v) { sfxOn = v; if (sfxBus) sfxBus.gain.value = v ? 0.55 : 0; }
export function setMusic(v) { musicOn = v; if (musBus) musBus.gain.setTargetAtTime(v ? 0.16 : 0, ctx.currentTime, 0.05); }

function tone(freq, t, dur, type = 'sine', vol = 0.3, bus = sfxBus, slideTo = 0, attack = 0.005) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, vol = 0.2, f0 = 3000, f1 = 800, bus = sfxBus, type = 'bandpass') {
  if (!ctx) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.05);
}
const now = () => ctx ? ctx.currentTime : 0;

export const sfx = {
  click() { const t = now(); tone(660, t, 0.09, 'triangle', 0.25); tone(990, t + 0.04, 0.1, 'triangle', 0.18); },
  start() { const t = now(); [392, 523, 659, 784].forEach((f, i) => tone(f, t + i * 0.08, 0.25, 'square', 0.12)); noise(t, 0.5, 0.12, 400, 4000); },
  spawn() { const t = now(); tone(180, t, 0.5, 'sawtooth', 0.12, sfxBus, 720); noise(t, 0.45, 0.14, 500, 5000); tone(880, t + 0.4, 0.15, 'triangle', 0.15); },
  shoot() { const t = now(); tone(1200, t, 0.28, 'sawtooth', 0.16, sfxBus, 220); tone(600, t, 0.2, 'square', 0.08, sfxBus, 1400); noise(t, 0.12, 0.1, 6000, 2000); },
  pop() { const t = now(); noise(t, 0.35, 0.3, 2400, 200); tone(300, t, 0.3, 'triangle', 0.3, sfxBus, 60); tone(900, t + 0.05, 0.25, 'sine', 0.15, sfxBus, 1500); },
  correct() { const t = now(); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { tone(f, t + i * 0.09, 0.32, 'triangle', 0.28); tone(f * 2, t + i * 0.09, 0.2, 'sine', 0.08); }); },
  wrong() { const t = now(); tone(220, t, 0.18, 'square', 0.16, sfxBus, 150); tone(165, t + 0.16, 0.3, 'square', 0.16, sfxBus, 110); },
  hurt() { const t = now(); noise(t, 0.25, 0.2, 900, 120, sfxBus, 'lowpass'); },
  whoosh() { const t = now(); noise(t, 0.4, 0.1, 400, 3000); },
  step() { const t = now(); noise(t, 0.06, 0.05, 700, 300, sfxBus, 'lowpass'); },
  win() {
    const t = now();
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => { tone(f, t + i * 0.13, 0.4, 'triangle', 0.3); tone(f / 2, t + i * 0.13, 0.4, 'sine', 0.15); });
    for (let i = 0; i < 6; i++) noise(t + 0.3 + i * 0.28, 0.3, 0.12, 5000, 800);
  },
  firework() { const t = now(); tone(900, t, 0.25, 'sine', 0.12, sfxBus, 200); noise(t + 0.22, 0.4, 0.2, 3500, 300); },
};

/* ---------- موسيقى: لحن شرقي مرح (سلّم حجاز على ري) ---------- */
const D = 146.83;
const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19]; // أنصاف نغمات
const mtof = s => D * Math.pow(2, s / 12);
// 8 مازورات × 8 نبضات؛ أرقام = درجة في HIJAZ، -1 = صمت
const MELODY = [
  [7, -1, 8, 7, 5, -1, 4, 5], [7, 5, 4, 3, 2, -1, 3, 4], [5, -1, 7, 8, 9, -1, 8, 7], [5, 4, 3, 2, 1, -1, 0, -1],
  [7, -1, 9, 10, 9, 7, 8, -1], [7, 5, 7, 8, 7, 5, 4, -1], [5, 7, 8, 9, 10, 9, 8, 7], [5, 4, 3, 4, 2, 1, 0, -1],
];
const BASS = [0, 0, 5, 5, 0, 0, 7, 0]; // سلسلة جذور (أنصاف نغمات تحت الجذر)
const BASS_SEMI = [0, 0, 5, 5, 3, 3, 7, 0].map(s => s - 12);
function schedule() {
  if (!ctx || !musicRunning) return;
  const spb = 0.26; // مدة النبضة
  while (nextT < ctx.currentTime + 0.4) {
    const bar = (step >> 3) % 8, beat = step & 7, t = nextT;
    const n = MELODY[bar][beat];
    if (n >= 0) { tone(mtof(HIJAZ[n] + 12), t, spb * 1.6, 'triangle', 0.5, musBus); tone(mtof(HIJAZ[n] + 24), t, spb * 0.8, 'sine', 0.12, musBus); }
    if (beat % 4 === 0) tone(mtof(BASS_SEMI[bar]), t, spb * 3.2, 'sine', 0.7, musBus);
    if (beat % 2 === 0) tone(mtof(BASS_SEMI[bar] + 12), t + spb * 0.5, spb, 'triangle', 0.18, musBus);
    if (beat === 0 || beat === 4) { tone(110, t, 0.18, 'sine', 0.9, musBus, 45); }
    if (beat === 2 || beat === 6) noise(t, 0.09, 0.35, 5000, 2500, musBus, 'highpass');
    if (beat % 2 === 1) noise(t, 0.04, 0.12, 8000, 6000, musBus, 'highpass');
    nextT += spb; step++;
  }
}
export function startMusic() {
  if (!ctx || musicRunning) return;
  musicRunning = true; nextT = ctx.currentTime + 0.1; step = 0;
  timer = setInterval(schedule, 120); schedule();
}
export function stopMusic() { musicRunning = false; clearInterval(timer); }
