// 効果音：録音素材（assets/audio/se、Kenney などの CC0）を鳴らし、読み込み前や素材のない音は WebAudio で合成
let actx = null, master = null, muted = false;
const ctx = () => {
  if (!actx) { actx = new AudioContext(); master = actx.createGain(); master.connect(actx.destination); }
  return actx;
};
const out = () => (ctx(), master);
export function unlockAudio() { try { ctx().resume(); } catch (e) { /* 無音 */ } }
export function setMuted(m) { muted = m; try { out().gain.value = m ? 0 : 1; } catch (e) { /* 無音 */ } }
export const isMuted = () => muted;

// ───── 録音素材 ─────
const BANK = {};   // 名前 → [AudioBuffer, ...]（同じ音の 3 パターン）
let voices = 0;    // 同時に鳴っている数（まとめて壊した時に鳴りすぎないように）
const MAX_VOICES = 18;
export async function loadSounds(base, names, variants = 3) {
  const a = ctx();
  await Promise.all(names.flatMap(name => Array.from({ length: name.n || variants }, async (_, i) => {
    const n = name.id || name;
    try {
      const r = await fetch(`${base}/${n}_${i}.ogg`);
      if (!r.ok) return;
      const buf = await a.decodeAudioData(await r.arrayBuffer());
      (BANK[n] = BANK[n] || [])[i] = buf;
    } catch (e) { /* 読めない音は合成で代わりに鳴らす */ }
  })));
}
// 鳴らせたら true。rate は再生速度（低くすると重い音に）、vol は音量
function play(name, vol = 1, rate = 1, at = 0) {
  const list = BANK[name]?.filter(Boolean);
  if (!list?.length) return false;
  if (voices >= MAX_VOICES) return true;   // 鳴らしすぎ：今回は省く（合成音にも回さない）
  try {
    const a = ctx(), src = a.createBufferSource(), g = a.createGain();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    g.gain.value = vol;
    src.connect(g).connect(out()); src.start(a.currentTime + at);
    voices++; src.onended = () => { voices--; };
  } catch (e) { return false; }
  return true;
}

// ───── 合成音 ─────
function noise(a, len, { decay = 3, filter = 'lowpass', freq = 1200, gain = 0.5, swell = false, at = 0 }) {
  const n = Math.floor(a.sampleRate * len), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) { const k = i / n; ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, decay) * (swell ? Math.sin(k * Math.PI) : 1); }
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = filter; f.frequency.value = freq;
  const gn = a.createGain(); gn.gain.value = gain;
  src.connect(f).connect(gn).connect(out()); src.start(a.currentTime + at);
}
function thump(a, f0, f1, len, gain, type = 'sine', at = 0) {
  const o = a.createOscillator(), og = a.createGain(), now = a.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(f1, now + len * 0.8);
  og.gain.setValueAtTime(gain, now); og.gain.exponentialRampToValueAtTime(0.001, now + len);
  o.connect(og).connect(out()); o.start(now); o.stop(now + len + 0.02);
}
function tone(a, freq, at, len, gain = 0.08, type = 'square') {
  const o = a.createOscillator(), gn = a.createGain(), now = a.currentTime + at;
  o.type = type; o.frequency.value = freq;
  gn.gain.setValueAtTime(gain, now); gn.gain.exponentialRampToValueAtTime(0.0001, now + len);
  o.connect(gn).connect(out()); o.start(now); o.stop(now + len + 0.02);
}

// 壊した物の大きさ（段階）ごとの割れる音
const BREAK = { 1: ['glass_l', 'tin', 'plate_l'], 2: ['wood_m', 'plank', 'plate_m'], 3: ['glass_m', 'metal_m', 'wood_h'], 4: ['glass_h', 'metal_h', 'wood_h'] };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// kind: 'swing' | 'hit' | 'break' | 'crush' | 'clank' | 'levelup' | 'unlock' | 'start' | 'collapse'
// size: 壊した物の段階（1〜8）。大きいほど低く重い音になる
export function sfx(kind, size = 1) {
  try {
    const a = ctx();
    switch (kind) {
      case 'swing': noise(a, 0.12, { decay: 4, filter: 'bandpass', freq: 3200, gain: 0.12, swell: true }); break;
      case 'hit':
        if (!play(size >= 4 ? 'hit_heavy' : 'hit', 0.8, size >= 6 ? 0.75 : 1)) { noise(a, 0.16, { decay: 4, freq: 700, gain: 0.5 }); thump(a, 190, 45, 0.22, 0.35); }
        break;
      case 'break': {
        const k = Math.min(1, (size - 1) / 7), rate = size >= 5 ? 1 - (size - 4) * 0.11 : 1;
        const ok = play(pick(BREAK[Math.min(size, 4)]), 0.9, rate);
        if (size >= 3) play('hit_heavy', 0.5, rate);
        if (size >= 5) { play('mining', 0.8, rate * 0.9, 0.04); play(pick(['metal_h', 'glass_h']), 0.7, rate, 0.1); }
        if (!ok) noise(a, 0.45 + k * 0.9, { decay: 2.2 - k * 0.8, freq: 1800 - k * 1300, gain: 0.55 + k * 0.25 });
        if (size >= 4) thump(a, 120 - k * 70, 28, 0.3 + k * 0.7, 0.3 + k * 0.3);   // 大きい物は低い「ドーン」を重ねる
        break;
      }
      case 'crush': if (!play('crush', 0.35, 0.9 + Math.random() * 0.4)) noise(a, 0.18, { decay: 3, freq: 1400, gain: 0.25 }); break;
      case 'clank':
        if (!play('clank', 0.8)) { tone(a, 1320, 0, 0.18, 0.07, 'square'); tone(a, 1980, 0, 0.12, 0.04, 'square'); }
        break;
      case 'levelup': if (!play('levelup', 0.7)) [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, i * 0.07, 0.22, 0.06)); break;
      case 'unlock': if (!play('unlock', 0.8)) [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(a, f, i * 0.08, 0.3, 0.06)); break;
      case 'start': play('start', 0.6); break;
      case 'collapse':
        noise(a, 4.5, { decay: 1.2, freq: 260, gain: 0.9 });
        for (let i = 0; i < 6; i++) { thump(a, 90, 25, 0.9, 0.5, 'sine', i * 0.55); play(pick(['mining', 'metal_h', 'glass_h']), 0.8, 0.55 + Math.random() * 0.2, i * 0.55); }
        break;
    }
  } catch (e) { /* 音が出せない環境では無音 */ }
}

// 足音。surface: 'wood' | 'concrete' | 'grass'。scale が大きいほど重い「ズシン」に
export function step(surface, scale) {
  try {
    if (scale < 4) play('step_' + surface, 0.22 + scale * 0.05, 1.05 - scale * 0.05);
    else { const r = Math.max(0.35, 1 - Math.log2(scale / 4) * 0.18); play('step_heavy', Math.min(1, 0.4 + Math.log2(scale) * 0.08), r); if (scale >= 16) thump(ctx(), 70, 22, 0.5, 0.25); }
  } catch (e) { /* 無音 */ }
}

// 「にゃっ」（ほかのねこの鳴き声）。freq でねこごとに声の高さを変える
export function meow(freq = 700) {
  if (play('meow', 0.45, freq / 600)) return;
  try {
    const a = ctx();
    const o = a.createOscillator(), gn = a.createGain(), now = a.currentTime;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq * 0.8, now); o.frequency.linearRampToValueAtTime(freq * 1.25, now + 0.08); o.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.28);
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq * 2.2; f.Q.value = 2;
    gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(0.06, now + 0.04); gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    o.connect(f).connect(gn).connect(out()); o.start(now); o.stop(now + 0.32);
  } catch (e) { /* 無音 */ }
}

// ───── BGM：場所が変わるとクロスフェードで切り替える ─────
export class Music {
  constructor(tracks, volume = 0.4) { this.tracks = tracks; this.volume = volume; this.els = {}; this.cur = null; }
  play(name) {
    if (this.cur === name) return;
    this.cur = name;
    if (!name) return;
    let el = this.els[name];
    if (!el) { el = this.els[name] = new Audio(this.tracks[name]); el.loop = true; el.volume = 0; }
    el.play().catch(() => { /* まだ操作されていない時は鳴らせない */ });
  }
  update(dt) {
    for (const [name, el] of Object.entries(this.els)) {
      const goal = name === this.cur && !muted ? this.volume : 0;
      el.volume = Math.max(0, Math.min(1, el.volume + Math.sign(goal - el.volume) * Math.min(Math.abs(goal - el.volume), dt / 2)));
      if (el.volume === 0 && name !== this.cur && !el.paused) el.pause();
    }
  }
}
