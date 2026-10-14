// 壊せる物のカタログ。build(g, o) は原点（床の中心）基準で組み立てる
//   tier : 壊せるようになる段階（config.js の TIERS）
//   w, d : 当たり判定の幅・奥行き（回転前）、h : だいたいの高さ
//   top  : 上に物を載せられる高さ（たな・テーブルなど。配列なら段ごと）
//   yen  : 被害額
//   solid: false で通り抜けられる（頭上の看板など）
import * as THREE from 'three';
import { box, cyl, sph, rod, plane, cg } from './core/geometry.js';
import { toon, basic, mGlass } from './core/materials.js';
import { textTex, canvasTex } from './core/textures.js';
import { rnd, pick, rr } from './core/random.js';
import { rbox, lathe, ico, tube, disc, torus, texMat, screenMat, text, stripes } from './core/shapes.js';

// ラベルの種類（背景色・帯の色・名前）
const CANS = [['#e8343e', '#ffffff', 'NYA COLA'], ['#3a7ad8', '#bfe0f5', 'ねこソーダ'], ['#f2a93b', '#f5d547', 'みかん'], ['#2a8a4a', '#c8ecc4', 'お茶'], ['#3b3f4a', '#f2c030', 'COFFEE'], ['#e86fa8', '#ffd9e8', 'もも']];
const BOTTLES = [[0xcfeaf7, '#3a7ad8', 'みず'], [0xd8e8b0, '#2a8a4a', 'お茶'], [0xf5d8a0, '#e8574a', '紅茶'], [0xe8f0f8, '#8a6ad8', 'NYAQUA']];
const SHOPBAGS = [['#f7f0e0', '#c04a7a', 'NYA'], ['#2a3a5a', '#f2c94c', 'mall'], ['#ffffff', '#2a8a4a', 'まるまる'], ['#e8574a', '#ffffff', 'SALE'], ['#c89a6a', '#ffffff', 'cafe']];
const BOOKS = [['#3a6a9a', 'ねこの本'], ['#c8564a', '料理'], ['#2a8a4a', '図鑑'], ['#8a6ad8', 'まんが'], ['#f2a93b', '旅行'], ['#3b3f4a', '小説'], ['#e86fa8', '絵本']];

export const M = (c, self = 0) => toon(c, self);
export const BRIGHT = ['#e8574a', '#f2a93b', '#f5d547', '#5cbf6a', '#4aa3e0', '#8a6ad8', '#e86fa8', '#ffffff'];
export const PASTEL = ['#f7c6c7', '#fbe3a6', '#c8ecc4', '#bfe0f5', '#dccaf2', '#ffd9b3'];
export const hex = (s) => parseInt(s.replace('#', ''), 16);
export const col = (arr) => hex(pick(arr));
const sign = (w, h, bg, fg, text, size) => basic(0xffffff, { map: textTex(w, h, bg, fg, [[text, size, h / 2]], { round: 10 }), side: THREE.DoubleSide });
const signCache = new Map();
export const signMat = (text, bg = '#ffffff', fg = '#333333', w = 512, h = 128, size = 64) => {
  const k = [text, bg, fg, w, h].join('|');
  if (!signCache.has(k)) signCache.set(k, sign(w, h, bg, fg, text, size));
  return signCache.get(k);
};
export const glow = (c, k = 0.5) => toon(c, k);
const WALL_TEX = new Map();

export const PROPS = {
  // ───────── tier 1：小物 ─────────
  can: { name: 'ジュース缶', tier: 1, yen: 130, w: 0.12, d: 0.12, h: 0.14, build(g) {
    const v = Math.floor(rnd() * CANS.length), [bg, fg, name] = CANS[v];
    const label = texMat('can' + v, 128, 64, (c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.fillStyle = fg; c.beginPath(); c.moveTo(0, 40); for (let x = 0; x <= w; x += 8) c.lineTo(x, 40 + Math.sin(x / 10) * 5); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      text(c, name, w / 2, 22, 18, fg === '#ffffff' ? '#ffffff' : '#ffffff'); text(c, name, w / 2 + 64, 22, 18, '#ffffff'); text(c, name, w / 2 - 64, 22, 18, '#ffffff');
    });
    const metal = M(0xd8dde4);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.042, 0], [0.05, 0.008], [0.05, 0.012]], metal, 16);
    tube(g, 0, 0.012, 0, 0.05, 0.05, 0.106, label, 16);
    lathe(g, 0, 0.118, 0, [[0.05, 0], [0.04, 0.012], [0.041, 0.016], [0.0, 0.014]], metal, 16);
    box(g, 0.012, 0.13, 0, 0.022, 0.004, 0.012, M(0xb8c0cc), false);
  } },
  bottle: { name: 'ペットボトル', tier: 1, yen: 160, w: 0.12, d: 0.12, h: 0.22, build(g) {
    const v = Math.floor(rnd() * BOTTLES.length), [liq, band, name] = BOTTLES[v];
    lathe(g, 0, 0, 0, [[0.0, 0], [0.04, 0], [0.046, 0.01], [0.046, 0.05], [0.042, 0.06], [0.046, 0.07], [0.046, 0.13], [0.03, 0.165], [0.017, 0.185], [0.017, 0.195]], M(liq), 16);
    tube(g, 0, 0.072, 0, 0.0475, 0.0475, 0.05, texMat('btl' + v, 128, 48, (c, w, h) => { c.fillStyle = band; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(0, 6, w, 3); c.fillRect(0, h - 9, w, 3); text(c, name, 32, h / 2, 16, '#ffffff'); text(c, name, 96, h / 2, 16, '#ffffff'); }), 16);
    lathe(g, 0, 0.195, 0, [[0.0, 0], [0.02, 0], [0.02, 0.022], [0.0, 0.022]], M(0xf5f5f5), 12);
  } },
  cup: { name: 'コーヒー', tier: 1, yen: 450, w: 0.12, d: 0.12, h: 0.17, build(g) {
    const v = Math.floor(rnd() * 3);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.04, 0], [0.055, 0.13], [0.0, 0.13]], M(0xf7f3ea), 16);
    tube(g, 0, 0.035, 0, 0.0505, 0.0455, 0.055, texMat('sleeve' + v, 128, 40, (c, w, h) => { c.fillStyle = ['#8a5a3a', '#3f7a5a', '#c8564a'][v]; c.fillRect(0, 0, w, h); c.fillStyle = '#f7f3ea'; c.beginPath(); c.arc(32, h / 2, 12, 0, 7); c.fill(); c.beginPath(); c.arc(96, h / 2, 12, 0, 7); c.fill(); text(c, '☕', 32, h / 2 + 1, 14, '#5a3a24'); text(c, '☕', 96, h / 2 + 1, 14, '#5a3a24'); }), 16);
    lathe(g, 0, 0.128, 0, [[0.0, 0], [0.058, 0], [0.058, 0.012], [0.048, 0.02], [0.046, 0.03], [0.0, 0.03]], M(v === 1 ? 0x2f4a3a : 0xffffff), 16);
    cyl(g, 0.025, 0.158, 0, 0.008, 0.008, 0.004, M(0x3a2a22), 8, false);
  } },
  donut: { name: 'ドーナツ', tier: 1, yen: 180, w: 0.16, d: 0.16, h: 0.06, build(g) {
    torus(g, 0, 0.03, 0, 0.055, 0.03, M(0xd8954a), -Math.PI / 2, 0, Math.PI * 2, 20);
    const icing = torus(g, 0, 0.042, 0, 0.055, 0.029, M(col(['#f59ac0', '#5a3424', '#ffffff', '#f5d547', '#8ad0f0'])), -Math.PI / 2, 0, Math.PI * 2, 20); icing.scale.z = 0.75;
    for (let i = 0; i < 14; i++) { const a = rr(0, 6.28), r = rr(0.035, 0.075); const s = box(g, Math.cos(a) * r, 0.06, Math.sin(a) * r, 0.012, 0.004, 0.004, M(col(BRIGHT)), false); s.rotation.y = rr(0, 3); }
  } },
  cake: { name: 'ショートケーキ', tier: 1, yen: 520, w: 0.14, d: 0.14, h: 0.13, build(g) {
    cyl(g, 0, 0, 0, 0.064, 0.064, 0.035, M(0xf2d08a), 18, false);
    cyl(g, 0, 0.035, 0, 0.065, 0.065, 0.012, M(0xe8343e), 18, false);
    cyl(g, 0, 0.047, 0, 0.064, 0.064, 0.03, M(0xf2d08a), 18, false);
    lathe(g, 0, 0, 0, [[0.066, 0.0], [0.067, 0.08], [0.06, 0.088], [0.0, 0.088]], M(0xfff8ee), 18);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; sph(g, Math.cos(a) * 0.05, 0.092, Math.sin(a) * 0.05, 0.012, M(0xfff8ee)); }
    sph(g, 0, 0.11, 0, 0.02, M(0xe8343e), 1, 1.2, 1); cyl(g, 0, 0.128, 0, 0.0, 0.012, 0.008, M(0x3f8a4a), 5, false);
  } },
  bag: { name: '買い物ぶくろ', tier: 1, yen: 3800, w: 0.26, d: 0.14, h: 0.36, build(g) {
    const v = Math.floor(rnd() * SHOPBAGS.length), [bg, fg, name] = SHOPBAGS[v];
    box(g, 0, 0, 0, 0.24, 0.26, 0.1, texMat('bag' + v, 128, 128, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.fillRect(0, 0, w, 10); text(c, name, w / 2, h * 0.55, 22, fg); c.strokeStyle = fg; c.lineWidth = 3; c.beginPath(); c.arc(w / 2, h * 0.55, 34, 0, 7); c.stroke(); }), false);
    for (const z of [-0.035, 0.035]) torus(g, 0, 0.26, z, 0.045, 0.006, M(0x3a2a22), 0, 0, Math.PI, 10);
  } },
  duck: { name: 'アヒルのおもちゃ', tier: 1, yen: 600, w: 0.16, d: 0.16, h: 0.16, build(g) {
    const y = M(0xf7d33a);
    sph(g, 0.01, 0.05, 0, 0.065, y, 1.25, 0.8, 1); sph(g, 0.075, 0.075, 0, 0.025, y, 1, 1.6, 0.8);
    sph(g, -0.045, 0.115, 0, 0.042, y);
    sph(g, -0.092, 0.108, 0, 0.022, M(0xf08a2a), 1.2, 0.5, 1);
    sph(g, -0.07, 0.128, 0.026, 0.008, M(0x1a1a22)); sph(g, -0.07, 0.128, -0.026, 0.008, M(0x1a1a22));
    sph(g, 0.01, 0.07, 0.055, 0.03, y, 1.3, 0.6, 0.5); sph(g, 0.01, 0.07, -0.055, 0.03, y, 1.3, 0.6, 0.5);
  } },
  ball: { name: 'ボール', tier: 1, yen: 900, w: 0.2, d: 0.2, h: 0.2, build(g) {
    const v = Math.floor(rnd() * 3);
    sph(g, 0, 0.09, 0, 0.09, texMat('ball' + v, 128, 64, (c, w, h) => stripes(c, w, h, [['#e8343e', '#ffffff', '#4aa3e0', '#ffffff', '#f5d547', '#ffffff'], ['#5cbf6a', '#f5d547', '#5cbf6a', '#f5d547', '#5cbf6a', '#f5d547'], ['#e86fa8', '#ffffff', '#8a6ad8', '#ffffff', '#4aa3e0', '#ffffff']][v], true)));
    sph(g, 0, 0.18, 0, 0.012, M(0xffffff), 1, 0.5, 1);
  } },
  block: { name: 'つみき', tier: 1, yen: 400, w: 0.2, d: 0.2, h: 0.24, build(g) {
    const letters = ['あ', 'い', 'う', 'ね', 'こ', 'A', 'B', 'C', '1', '2'];
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const L = pick(letters), c = pick(BRIGHT.slice(0, 7));
      const b = box(g, rr(-0.01, 0.01), i * 0.08, rr(-0.01, 0.01), 0.08, 0.08, 0.08, texMat('blk' + L + c, 64, 64, (x, w, h) => { x.fillStyle = '#f7f0e0'; x.fillRect(0, 0, w, h); x.fillStyle = c; x.fillRect(5, 5, w - 10, h - 10); text(x, L, w / 2, h / 2 + 2, 40, '#ffffff'); }), false);
      b.rotation.y = rr(-0.5, 0.5);
    }
  } },
  pot: { name: '鉢植え', tier: 1, yen: 980, w: 0.2, d: 0.2, h: 0.32, build(g) {
    const v = Math.floor(rnd() * 3);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.055, 0], [0.07, 0.11], [0.08, 0.115], [0.08, 0.135], [0.068, 0.135], [0.0, 0.125]], M(col(['#c2643c', '#e8e2d6', '#4a6a9a'])), 16);
    disc(g, 0, 0.128, 0, 0.068, M(0x5a3a24), 16);
    if (v === 0) {   // サボテン
      const c = M(0x4f9c56); cyl(g, 0, 0.12, 0, 0.035, 0.04, 0.13, c, 10, false); sph(g, 0, 0.25, 0, 0.036, c);
      cyl(g, 0.04, 0.18, 0, 0.016, 0.018, 0.04, c, 8, false).rotation.z = -1.1; sph(g, 0.064, 0.205, 0, 0.017, c); sph(g, 0, 0.29, 0, 0.018, M(0xf28aa0));
    } else if (v === 1) {   // 葉っぱ
      const c = M(col(['#5cbf6a', '#3f9c56']));
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; const l = sph(g, Math.cos(a) * 0.05, 0.19 + rr(0, 0.05), Math.sin(a) * 0.05, 0.045, c, 1.6, 0.35, 0.8); l.rotation.y = -a; l.rotation.z = 0.5; }
      ico(g, 0, 0.21, 0, 0.05, c, 1);
    } else {   // 花
      for (let i = 0; i < 5; i++) {
        const x = rr(-0.04, 0.04), z = rr(-0.04, 0.04), h = rr(0.12, 0.18);
        rod(g, [x * 0.3, 0.13, z * 0.3], [x, 0.13 + h, z], 0.004, M(0x3f8a4a));
        sph(g, x, 0.13 + h, z, 0.022, M(col(['#f28aa0', '#f5d547', '#ffffff', '#e8574a', '#c890f0'])), 1, 0.6, 1); sph(g, x, 0.135 + h, z, 0.008, M(0xf5c030));
      }
      for (let i = 0; i < 4; i++) { const a = i * 1.6; sph(g, Math.cos(a) * 0.04, 0.15, Math.sin(a) * 0.04, 0.03, M(0x4f9c56), 1.4, 0.4, 0.8).rotation.y = -a; }
    }
  } },
  book: { name: '本', tier: 1, yen: 1500, w: 0.18, d: 0.08, h: 0.24, build(g) {
    const v = Math.floor(rnd() * BOOKS.length), [c, title] = BOOKS[v];
    const cover = texMat('book' + v, 64, 96, (x, w, h) => {
      x.fillStyle = c; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff22'; x.fillRect(0, 0, 6, h);
      x.strokeStyle = '#ffffffaa'; x.lineWidth = 2; x.strokeRect(8, 8, w - 16, h - 16);
      x.fillStyle = '#f7f0e0'; x.fillRect(12, 22, w - 24, 22); text(x, title, w / 2, 33, 13, '#333');
      x.fillStyle = '#ffffff88'; x.beginPath(); x.arc(w / 2, 66, 10, 0, 7); x.fill();
    });
    box(g, 0, 0, 0, 0.16, 0.22, 0.05, cover, false);
    box(g, 0.006, 0.006, 0, 0.152, 0.208, 0.042, M(0xf7f3ea), false);
  } },
  phone: { name: 'スマホ（展示品）', tier: 1, yen: 98000, w: 0.12, d: 0.1, h: 0.17, build(g) {
    rbox(g, 0, 0, 0, 0.09, 0.02, 0.07, 0.008, M(0xe8e8ec));
    const p = rbox(g, 0, 0.02, -0.01, 0.07, 0.14, 0.01, 0.006, M(col(['#2a2f3a', '#e8e2d6', '#c8a8d8', '#a8c8d8'])));
    p.rotation.x = -0.25;
    plane(p, 0, 0, 0.0052, 0.062, 0.128, screenMat('phoneScr', 64, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5aa9f0'); gr.addColorStop(1, '#c890f0'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      const cols = ['#ffffff', '#5cbf6a', '#f5d547', '#e8574a', '#f2a93b', '#4aa3e0'];
      for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) { c.fillStyle = cols[(r * 4 + k) % cols.length]; c.beginPath(); c.roundRect(5 + k * 15, 18 + r * 18, 11, 11, 3); c.fill(); }
      text(c, '12:34', w / 2, 9, 9, '#ffffff');
    }));
  } },
  shoe: { name: 'スニーカー', tier: 1, yen: 8800, w: 0.26, d: 0.12, h: 0.11, build(g) {
    const c = M(col(['#e8574a', '#4aa3e0', '#3b3f4a', '#5cbf6a', '#ffffff'])), w = M(0xf7f7f2);
    rbox(g, 0, 0, 0, 0.25, 0.03, 0.095, 0.012, w);
    rbox(g, 0.025, 0.025, 0, 0.17, 0.06, 0.085, 0.025, c);
    rbox(g, -0.075, 0.025, 0, 0.08, 0.035, 0.085, 0.017, c);
    rbox(g, -0.1, 0.025, 0, 0.04, 0.03, 0.09, 0.012, w);
    for (let i = 0; i < 3; i++) box(g, -0.02 - i * 0.025, 0.08 - i * 0.008, 0, 0.006, 0.006, 0.05, w, false);
    box(g, 0.03, 0.05, 0.0435, 0.08, 0.014, 0.002, w, false); box(g, 0.03, 0.05, -0.0435, 0.08, 0.014, 0.002, w, false);
  } },
  hat: { name: 'ぼうし', tier: 1, yen: 3900, w: 0.26, d: 0.26, h: 0.13, build(g) {
    const c = M(col(['#e8d6a8', '#3b3f4a', '#c8564a', '#4a6a9a', '#f7f3ea']));
    lathe(g, 0, 0, 0, [[0.0, 0.004], [0.125, 0], [0.13, 0.008], [0.07, 0.014]], c, 24);
    lathe(g, 0, 0.012, 0, [[0.068, 0], [0.066, 0.07], [0.055, 0.1], [0.0, 0.105]], c, 20);
    tube(g, 0, 0.014, 0, 0.0695, 0.0695, 0.022, M(col(['#3b3f4a', '#e8574a', '#ffffff'])), 20);
  } },
  teddy: { name: 'くまのぬいぐるみ', tier: 1, yen: 2500, w: 0.2, d: 0.2, h: 0.3, build(g) {
    const c = M(col(['#b07a4a', '#e8c49a', '#f2b0c0', '#ffffff', '#a8c8e8'])), l = M(0xf4e6d4), k = M(0x2a1a14);
    sph(g, 0, 0.08, 0, 0.07, c, 1, 1.1, 0.95); sph(g, 0, 0.075, 0.045, 0.045, l, 1, 1, 0.5);
    for (const s of [-1, 1]) { sph(g, s * 0.075, 0.1, 0.02, 0.025, c, 1, 1.6, 1).rotation.z = s * 0.6; sph(g, s * 0.045, 0.02, 0.05, 0.03, c, 1, 0.8, 1.3); sph(g, s * 0.045, 0.02, 0.085, 0.016, l, 1, 1, 0.4); }
    sph(g, 0, 0.2, 0, 0.06, c);
    for (const s of [-1, 1]) { sph(g, s * 0.045, 0.25, -0.005, 0.022, c); sph(g, s * 0.045, 0.25, 0.006, 0.012, l, 1, 1, 0.5); sph(g, s * 0.022, 0.215, 0.052, 0.007, k); }
    sph(g, 0, 0.19, 0.05, 0.022, l, 1, 0.8, 0.7); sph(g, 0, 0.198, 0.067, 0.008, k);
    sph(g, -0.022, 0.155, 0.045, 0.014, M(0xe8343e), 1, 0.7, 0.6); sph(g, 0.022, 0.155, 0.045, 0.014, M(0xe8343e), 1, 0.7, 0.6);
  } },
  basket: { name: '買い物かご', tier: 1, yen: 800, w: 0.42, d: 0.3, h: 0.3, build(g) {
    const v = rnd() < 0.5 ? 0 : 1, base = ['#e8574a', '#4aa3e0'][v];
    const mesh = texMat('basket' + v, 64, 64, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) c.clearRect(4 + x * 10, 10 + y * 12, 7, 8); }, { alphaTest: 0.5, side: THREE.DoubleSide, transparent: false });
    const solid = M(hex(base));
    box(g, 0, 0, 0, 0.38, 0.015, 0.26, solid, false);
    box(g, 0, 0, 0.13, 0.4, 0.22, 0.005, mesh, false); box(g, 0, 0, -0.13, 0.4, 0.22, 0.005, mesh, false);
    box(g, 0.2, 0, 0, 0.005, 0.22, 0.26, mesh, false); box(g, -0.2, 0, 0, 0.005, 0.22, 0.26, mesh, false);
    box(g, 0, 0.205, 0, 0.41, 0.02, 0.27, solid, false);
    for (const x of [-0.08, 0.08]) torus(g, x, 0.215, 0, 0.12, 0.008, M(0x3a3f48), 0, Math.PI / 2, Math.PI, 12);
  } },
  ramen: { name: 'ラーメン', tier: 1, yen: 850, w: 0.2, d: 0.2, h: 0.11, build(g) {
    const bowl = texMat('ramenBowl', 128, 32, (c, w, h) => { c.fillStyle = '#d8343e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f7f0e0'; c.lineWidth = 3; for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, 8); c.lineTo(x + 8, 8); c.lineTo(x + 8, 16); c.lineTo(x + 4, 16); c.stroke(); } });
    lathe(g, 0, 0, 0, [[0.0, 0], [0.04, 0], [0.042, 0.012], [0.085, 0.07], [0.09, 0.08], [0.085, 0.08], [0.04, 0.02], [0.0, 0.02]], M(0xf7f0e0), 24);
    tube(g, 0, 0.012, 0, 0.0855, 0.0425, 0.058, bowl, 24);
    disc(g, 0, 0.068, 0, 0.081, texMat('ramenTop', 128, 128, (c, w, h) => {
      c.fillStyle = '#d8a050'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#f2d890'; c.lineWidth = 3; for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(64 + rr(-30, 30), 64 + rr(-30, 30), rr(8, 22), rr(0, 3), rr(3, 6)); c.stroke(); }
      c.fillStyle = '#c87a5a'; c.beginPath(); c.arc(40, 50, 18, 0, 7); c.fill(); c.fillStyle = '#e8b8a0'; c.beginPath(); c.arc(40, 50, 10, 0, 7); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(86, 46, 14, 0, 7); c.fill(); c.fillStyle = '#f2a93b'; c.beginPath(); c.arc(86, 46, 7, 0, 7); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(80, 88, 11, 0, 7); c.fill(); c.strokeStyle = '#f28aa0'; c.lineWidth = 2; c.beginPath(); for (let a = 0; a < 12; a += 0.3) c.lineTo(80 + Math.cos(a) * a * 0.8, 88 + Math.sin(a) * a * 0.8); c.stroke();
      c.fillStyle = '#2a3a2a'; c.fillRect(22, 78, 24, 30);
      c.fillStyle = '#5cbf6a'; for (let i = 0; i < 18; i++) c.fillRect(50 + rr(-12, 12), 70 + rr(-10, 14), 4, 4);
    }), 24);
    rod(g, [-0.06, 0.08, 0.07], [0.09, 0.09, -0.05], 0.004, M(0xc8945a)); rod(g, [-0.055, 0.08, 0.08], [0.095, 0.09, -0.04], 0.004, M(0xc8945a));
  } },
  tray: { name: 'ハンバーガーセット', tier: 1, yen: 690, w: 0.32, d: 0.24, h: 0.17, build(g) {
    rbox(g, 0, 0, 0, 0.3, 0.012, 0.22, 0.005, M(0xd8443a));
    box(g, 0, 0.012, 0, 0.26, 0.001, 0.18, texMat('traypaper', 64, 48, (c, w, h) => { c.fillStyle = '#f7f0e0'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8574a'; for (let i = 0; i < 6; i++) c.fillRect(i * 11, 0, 5, h); }), false);
    const bx = -0.06, bun = M(0xd99a4a);
    lathe(g, bx, 0.014, 0, [[0.0, 0], [0.05, 0], [0.055, 0.012], [0.0, 0.018]], bun, 16);
    cyl(g, bx, 0.03, 0, 0.056, 0.056, 0.016, M(0x5a3420), 16, false);
    box(g, bx, 0.046, 0, 0.09, 0.004, 0.09, M(0xf5c030), false).rotation.y = 0.4;
    cyl(g, bx, 0.05, 0, 0.06, 0.06, 0.005, M(0x6ac04a), 12, false);
    lathe(g, bx, 0.055, 0, [[0.0, 0], [0.056, 0], [0.058, 0.01], [0.045, 0.035], [0.0, 0.042]], bun, 16);
    for (let i = 0; i < 6; i++) { const a = i; sph(g, bx + Math.cos(a) * 0.025, 0.093 - (i % 2) * 0.004, Math.sin(a) * 0.025, 0.004, M(0xfff6e0)); }
    const fx = 0.085, fz = 0.04; box(g, fx, 0.014, fz, 0.06, 0.06, 0.035, M(0xe8343e), false);
    for (let i = 0; i < 8; i++) box(g, fx + rr(-0.022, 0.022), 0.05 + rr(0, 0.02), fz + rr(-0.012, 0.012), 0.008, 0.06, 0.008, M(0xf5c838), false).rotation.z = rr(-0.25, 0.25);
    lathe(g, 0.085, 0.014, -0.055, [[0.0, 0], [0.03, 0], [0.038, 0.11], [0.0, 0.11]], M(0xffffff), 14);
    cyl(g, 0.085, 0.124, -0.055, 0.039, 0.039, 0.006, M(0xe8e2d6), 14, false); rod(g, [0.085, 0.12, -0.055], [0.095, 0.17, -0.06], 0.004, M(0xe8343e));
  } },

  // ───────── tier 2：いす・ゴミ箱など ─────────
  chair: { name: 'いす', tier: 2, yen: 12000, w: 0.48, d: 0.48, h: 0.92, build(g) {
    const c = M(col(['#e8574a', '#f2a93b', '#4aa3e0', '#5cbf6a', '#f7f3ea', '#c8945a'])), leg = M(0x4a4f5a);
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) { const l = rod(g, [x * 1.1, 0, z * 1.1], [x * 0.9, 0.43, z * 0.9], 0.016, leg, 8); }
    rod(g, [-0.18, 0.18, 0.19], [0.18, 0.18, 0.19], 0.009, leg, 6); rod(g, [-0.18, 0.18, -0.19], [0.18, 0.18, -0.19], 0.009, leg, 6);
    rbox(g, 0, 0.42, 0, 0.46, 0.05, 0.44, 0.02, c);
    for (const x of [-0.19, 0.19]) rod(g, [x, 0.45, -0.2], [x * 1.02, 0.9, -0.24], 0.014, leg, 8);
    const back = rbox(g, 0, 0.62, -0.225, 0.44, 0.24, 0.035, 0.015, c); back.rotation.x = -0.1;
    for (let i = 0; i < 3; i++) box(g, -0.12 + i * 0.12, 0.52, -0.205, 0.05, 0.06, 0.02, c, false).rotation.x = -0.1;
  } },
  table: { name: 'テーブル', tier: 2, yen: 25000, w: 0.86, d: 0.86, h: 0.74, top: 0.74, build(g) {
    const metal = M(0x3a3f48);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.3, 0], [0.3, 0.015], [0.08, 0.04], [0.0, 0.04]], metal, 24);
    cyl(g, 0, 0.04, 0, 0.035, 0.035, 0.64, metal, 10);
    lathe(g, 0, 0.66, 0, [[0.0, 0], [0.14, 0], [0.14, 0.03], [0.0, 0.03]], metal, 4).rotation.y = Math.PI / 4;
    rbox(g, 0, 0.69, 0, 0.84, 0.05, 0.84, 0.015, texMat('tabletop' + Math.floor(rnd() * 3), 64, 64, (c, w, h) => { const b = pick(['#f7f3ea', '#c89a6a', '#e8e2d6']); c.fillStyle = b; c.fillRect(0, 0, w, h); c.strokeStyle = '#00000014'; for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(0, i * 7 + rr(0, 3)); c.bezierCurveTo(20, i * 7 + rr(-3, 3), 40, i * 7 + rr(-3, 3), 64, i * 7); c.stroke(); } }), true);
  } },
  longtable: { name: '長テーブル', tier: 2, yen: 40000, w: 1.6, d: 0.8, h: 0.74, top: 0.74, build(g) {
    const leg = M(0x3a3f48);
    for (const x of [-0.7, 0.7]) { rod(g, [x, 0, -0.32], [x, 0.7, -0.32], 0.022, leg, 8); rod(g, [x, 0, 0.32], [x, 0.7, 0.32], 0.022, leg, 8); rod(g, [x, 0.08, -0.32], [x, 0.08, 0.32], 0.014, leg, 6); }
    rod(g, [-0.7, 0.08, 0], [0.7, 0.08, 0], 0.014, leg, 6);
    rbox(g, 0, 0.69, 0, 1.6, 0.05, 0.8, 0.015, M(col(['#f7f3ea', '#c89a6a', '#a8743e'])), true);
  } },
  bin: { name: 'ゴミ箱', tier: 2, yen: 15000, w: 0.6, d: 0.6, h: 0.98, build(g) {
    const v = Math.floor(rnd() * 3), c = ['#5a8a6a', '#4a6a9a', '#8a8f9a'][v], lab = ['もえる', 'ペットボトル', 'かん・びん'][v];
    lathe(g, 0, 0, 0, [[0.0, 0], [0.24, 0], [0.26, 0.02], [0.28, 0.8], [0.0, 0.8]], M(hex(c)), 24);
    tube(g, 0, 0.35, 0, 0.274, 0.2685, 0.18, texMat('binL' + v, 128, 40, (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(8, 6, 50, 28, 6); x.fill(); text(x, lab, 33, 20, 9, c); x.beginPath(); x.roundRect(72, 6, 50, 28, 6); x.fill(); text(x, '♻', 97, 21, 16, c); }), 24);
    lathe(g, 0, 0.8, 0, [[0.0, 0], [0.3, 0], [0.3, 0.04], [0.22, 0.12], [0.0, 0.16]], M(0x3a3f48), 24);
    box(g, 0, 0.88, 0.17, 0.22, 0.05, 0.1, M(0x1a1a22), false).rotation.x = -0.6;
  } },
  cone: { name: 'カラーコーン', tier: 2, yen: 3000, w: 0.44, d: 0.44, h: 0.72, build(g) {
    rbox(g, 0, 0, 0, 0.42, 0.04, 0.42, 0.015, M(0xe8742a));
    const o = M(0xf08a2a), w = M(0xf7f7f2);
    lathe(g, 0, 0.04, 0, [[0.16, 0], [0.12, 0.2]], o, 20); lathe(g, 0, 0.24, 0, [[0.12, 0], [0.095, 0.12]], w, 20);
    lathe(g, 0, 0.36, 0, [[0.095, 0], [0.065, 0.16]], o, 20); lathe(g, 0, 0.52, 0, [[0.065, 0], [0.045, 0.09]], w, 20);
    lathe(g, 0, 0.61, 0, [[0.045, 0], [0.025, 0.1], [0.0, 0.1]], o, 20);
  } },
  planter: { name: '観葉植物', tier: 3, yen: 18000, w: 0.66, d: 0.66, h: 1.5, build(g) {
    const pot = M(col(['#f7f3ea', '#8a6a4a', '#3b3f4a', '#c2643c']));
    lathe(g, 0, 0, 0, [[0.0, 0], [0.22, 0], [0.3, 0.5], [0.31, 0.52], [0.0, 0.5]], pot, 20);
    disc(g, 0, 0.495, 0, 0.29, M(0x5a3a24), 20);
    const v = Math.floor(rnd() * 2), lf = M(col(['#4f9c56', '#5cbf6a', '#3f8a4a']));
    if (v === 0) {   // モンステラ風：大きな葉を放射状に
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * 6.28 + rr(-0.2, 0.2), r = rr(0.15, 0.32), y = rr(0.85, 1.35);
        rod(g, [0, 0.5, 0], [Math.cos(a) * r, y, Math.sin(a) * r], 0.012, M(0x5a8a3a), 5);
        const l = sph(g, Math.cos(a) * (r + 0.1), y + 0.02, Math.sin(a) * (r + 0.1), 0.16, lf, 1.1, 0.12, 0.75); l.rotation.set(0, -a, -0.5);
      }
    } else {   // ベンジャミン風：幹と葉のかたまり
      rod(g, [0, 0.5, 0], [0.04, 1.1, 0.02], 0.03, M(0x7a5a3a), 6); rod(g, [0.02, 0.8, 0], [-0.15, 1.15, 0.05], 0.018, M(0x7a5a3a), 6);
      for (const [x, y, z, r] of [[0.05, 1.25, 0, 0.26], [-0.18, 1.15, 0.08, 0.2], [0.18, 1.05, -0.1, 0.18], [0, 1.42, 0.04, 0.17]]) ico(g, x, y, z, r, lf, 1);
    }
  } },
  aframe: { name: '立て看板', tier: 2, yen: 8000, w: 0.62, d: 0.5, h: 1.05, build(g) {
    const v = Math.floor(rnd() * 4), [t1, t2, bg] = [['SALE', '50%OFF', '#e8574a'], ['本日の', 'おすすめ', '#2a4a3a'], ['NEW', 'OPEN!', '#3a6ab8'], ['ねこ', '大歓迎', '#c8945a']][v];
    const face = texMat('aframe' + v, 128, 192, (c, w, h) => {
      c.fillStyle = '#6a4a32'; c.fillRect(0, 0, w, h); c.fillStyle = bg; c.fillRect(8, 8, w - 16, h - 16);
      text(c, t1, w / 2, 56, 30, '#ffffff'); text(c, t2, w / 2, 100, 26, '#f5d547');
      c.strokeStyle = '#ffffff'; c.setLineDash([6, 5]); c.lineWidth = 2; c.strokeRect(16, 16, w - 32, h - 32);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w / 2, 150, 12, 0, 7); c.fill();
    });
    for (const s of [-1, 1]) {
      const p = box(g, 0, 0, s * 0.14, 0.6, 1.02, 0.03, face); p.rotation.x = -s * 0.22; if (s < 0) p.rotation.y = Math.PI;
    }
    rod(g, [-0.25, 0.4, -0.08], [-0.25, 0.4, 0.08], 0.008, M(0x3a3f48), 5); rod(g, [0.25, 0.4, -0.08], [0.25, 0.4, 0.08], 0.008, M(0x3a3f48), 5);
  } },
  cart: { name: 'ショッピングカート', tier: 2, yen: 30000, w: 0.56, d: 0.9, h: 1.0, build(g) {
    const metal = M(0xb8c0cc), red = M(0xe8343e);
    const wire = texMat('wire', 64, 64, (c, w, h) => { c.strokeStyle = '#c8d0dc'; c.lineWidth = 3; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 8, 0); c.lineTo(i * 8, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 8); c.lineTo(w, i * 8); c.stroke(); } }, { alphaTest: 0.5, side: THREE.DoubleSide });
    box(g, 0, 0.42, 0.05, 0.48, 0.01, 0.68, wire, false);
    box(g, 0, 0.42, 0.39, 0.5, 0.48, 0.01, wire, false); box(g, 0, 0.42, -0.29, 0.44, 0.42, 0.01, wire, false);
    box(g, 0.245, 0.42, 0.05, 0.01, 0.48, 0.68, wire, false); box(g, -0.245, 0.42, 0.05, 0.01, 0.48, 0.68, wire, false);
    for (const [a, b] of [[[-0.25, 0.9, 0.39], [0.25, 0.9, 0.39]], [[-0.25, 0.9, -0.29], [-0.25, 0.9, 0.39]], [[0.25, 0.9, -0.29], [0.25, 0.9, 0.39]], [[-0.22, 0.84, -0.29], [0.22, 0.84, -0.29]]]) rod(g, a, b, 0.012, metal, 6);
    rod(g, [-0.25, 0.9, 0.39], [-0.25, 1.0, 0.48], 0.014, metal, 6); rod(g, [0.25, 0.9, 0.39], [0.25, 1.0, 0.48], 0.014, metal, 6);
    rod(g, [-0.26, 1.0, 0.48], [0.26, 1.0, 0.48], 0.022, red, 10);
    for (const s of [-1, 1]) { rod(g, [s * 0.22, 0.06, -0.32], [s * 0.24, 0.42, -0.25], 0.014, metal, 6); rod(g, [s * 0.22, 0.06, 0.38], [s * 0.24, 0.42, 0.38], 0.014, metal, 6); rod(g, [s * 0.22, 0.06, -0.32], [s * 0.22, 0.06, 0.38], 0.012, metal, 6); }
    box(g, 0, 0.12, 0.03, 0.42, 0.01, 0.6, wire, false);
    for (const [x, z] of [[-0.22, -0.32], [0.22, -0.32], [-0.22, 0.38], [0.22, 0.38]]) { cyl(g, x - 0.015, 0.045, z, 0.045, 0.045, 0.03, M(0x2a2f3a), 12, false).rotation.z = Math.PI / 2; }
    box(g, 0, 0.88, 0.395, 0.3, 0.1, 0.005, M(0x2a6a9a), false);
  } },
  tv: { name: 'テレビ', tier: 2, yen: 128000, w: 1.1, d: 0.4, h: 1.25, build(g) {
    rbox(g, 0, 0, 0, 0.9, 0.48, 0.38, 0.02, M(0x3a3f48));
    box(g, -0.22, 0.06, 0.191, 0.4, 0.34, 0.005, M(0x2a2f38), false); box(g, 0.22, 0.06, 0.191, 0.4, 0.34, 0.005, M(0x2a2f38), false);
    rbox(g, 0, 0.48, 0, 0.32, 0.02, 0.2, 0.008, M(0x1a1a22)); box(g, 0, 0.5, -0.02, 0.06, 0.12, 0.04, M(0x1a1a22));
    rbox(g, 0, 0.6, 0, 1.08, 0.64, 0.045, 0.012, M(0x15161c));
    const v = Math.floor(rnd() * 3);
    plane(g, 0, 0.92, 0.0235, 1.02, 0.58, screenMat('tv' + v, 160, 90, (c, w, h) => {
      if (v === 0) { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6ab8f0'); gr.addColorStop(1, '#d8f0ff'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#5a9a5a'; c.beginPath(); c.moveTo(0, h); c.lineTo(40, 40); c.lineTo(80, 70); c.lineTo(120, 30); c.lineTo(w, h); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(108, 40); c.lineTo(120, 30); c.lineTo(132, 40); c.fill(); }
      else if (v === 1) { c.fillStyle = '#f5d8a0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a22'; c.beginPath(); c.arc(80, 52, 26, 0, 7); c.fill(); c.beginPath(); c.moveTo(56, 40); c.lineTo(60, 14); c.lineTo(74, 30); c.fill(); c.beginPath(); c.moveTo(104, 40); c.lineTo(100, 14); c.lineTo(86, 30); c.fill(); c.fillStyle = '#f2c030'; c.fillRect(68, 46, 6, 6); c.fillRect(86, 46, 6, 6); }
      else { c.fillStyle = '#2a3a6a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(0, h - 20, w, 20); text(c, 'ねこニュース', 50, h - 10, 11, '#2a3a6a'); c.fillStyle = '#e8574a'; c.fillRect(110, 10, 40, 14); text(c, 'LIVE', 130, 17, 10, '#ffffff'); c.fillStyle = '#f2d8b8'; c.beginPath(); c.arc(70, 45, 16, 0, 7); c.fill(); }
    }));
  } },
  washer: { name: '洗たく機', tier: 2, yen: 98000, w: 0.66, d: 0.66, h: 1.0, build(g) {
    const w = M(0xf2f4f6);
    rbox(g, 0, 0, 0, 0.64, 0.98, 0.64, 0.04, w);
    torus(g, 0, 0.45, 0.32, 0.2, 0.03, M(0xd8dde4), 0, 0, Math.PI * 2, 24);
    const door = disc(g, 0, 0.45, 0.322, 0.18, M(0x6a8aa8), 24); door.rotation.x = Math.PI / 2;
    rbox(g, 0, 0.82, 0.3, 0.6, 0.12, 0.06, 0.02, M(0xd8dde4));
    plane(g, -0.12, 0.88, 0.331, 0.18, 0.06, screenMat('washScr', 64, 24, (c) => { c.fillStyle = '#1a2a3a'; c.fillRect(0, 0, 64, 24); text(c, '0:42', 32, 12, 14, '#8ad8f0'); }));
    for (let i = 0; i < 3; i++) cyl(g, 0.06 + i * 0.07, 0.88, 0.33, 0.018, 0.018, 0.01, M(i === 0 ? 0x5aa9f0 : 0x9aa0aa), 10, false).rotation.x = Math.PI / 2;
  } },
  rack: { name: '洋服ラック', tier: 3, yen: 45000, w: 1.3, d: 0.5, h: 1.45, build(g) {
    const metal = M(0xb8c0cc);
    for (const x of [-0.6, 0.6]) { rod(g, [x, 0.02, 0], [x, 1.4, 0], 0.015, metal, 8); rod(g, [x, 0.03, -0.22], [x, 0.03, 0.22], 0.015, metal, 8); for (const z of [-0.22, 0.22]) cyl(g, x, 0, z, 0.025, 0.025, 0.02, M(0x2a2f3a), 8, false); }
    rod(g, [-0.62, 1.38, 0], [0.62, 1.38, 0], 0.014, metal, 8);
    for (let i = 0; i < 7; i++) {
      const x = -0.45 + i * 0.15, c = col(BRIGHT.concat(PASTEL));
      const shirt = texMat('shirt' + c, 64, 80, (t, w, h) => {
        t.fillStyle = '#' + c.toString(16).padStart(6, '0'); t.beginPath(); t.moveTo(18, 4); t.lineTo(0, 18); t.lineTo(8, 30); t.lineTo(14, 26); t.lineTo(14, 80); t.lineTo(50, 80); t.lineTo(50, 26); t.lineTo(56, 30); t.lineTo(64, 18); t.lineTo(46, 4); t.lineTo(38, 8); t.lineTo(26, 8); t.closePath(); t.fill();
        t.fillStyle = '#00000022'; t.fillRect(14, 70, 36, 3);
      }, { alphaTest: 0.5, side: THREE.DoubleSide });
      torus(g, x, 1.33, 0, 0.03, 0.004, metal, 0, Math.PI / 2, Math.PI * 1.4, 8);
      box(g, x, 0.65, 0, 0.012, 0.68, 0.42, shirt, false).rotation.y = Math.PI / 2;
    }
  } },
  gacha: { name: 'ガチャガチャ', tier: 2, yen: 60000, w: 0.56, d: 0.56, h: 1.35, build(g) {
    const v = Math.floor(rnd() * 4), base = ['#e8574a', '#4aa3e0', '#f5d547', '#5cbf6a'][v];
    rbox(g, 0, 0, 0, 0.52, 0.7, 0.52, 0.04, M(hex(base)));
    plane(g, 0, 0.5, 0.262, 0.4, 0.2, texMat('gachaL' + v, 128, 64, (c, w, h) => { c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(0, 0, w, h, 10); c.fill(); text(c, 'ねこ', 40, 22, 18, base); text(c, 'ガチャ', 40, 44, 16, base); c.fillStyle = base; c.beginPath(); c.arc(98, 32, 18, 0, 7); c.fill(); text(c, '¥200', 98, 32, 12, '#ffffff'); }));
    cyl(g, 0, 0.3, 0.262, 0.07, 0.07, 0.04, M(0xd8dde4), 16, false).rotation.x = Math.PI / 2;
    box(g, 0, 0.29, 0.29, 0.1, 0.025, 0.02, M(0x9aa0aa), false);
    box(g, 0, 0.06, 0.262, 0.16, 0.1, 0.02, M(0x1a1a22), false);
    box(g, 0, 0.7, 0, 0.48, 0.04, 0.48, M(hex(base)));
    const glass = new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.25, depthWrite: false });
    sph(g, 0, 0.98, 0, 0.24, glass);
    for (let i = 0; i < 14; i++) { const a = rr(0, 6.28), r = rr(0, 0.15), y = 0.78 + rr(0, 0.22); const cap = sph(g, Math.cos(a) * r, y, Math.sin(a) * r, 0.045, M(col(BRIGHT))); sph(g, Math.cos(a) * r, y + 0.004, Math.sin(a) * r, 0.0455, M(0xffffff), 1, 0.5, 1); }
    cyl(g, 0, 1.2, 0, 0.06, 0.08, 0.06, M(hex(base)), 14, false);
  } },
  stool: { name: 'スツール', tier: 2, yen: 9000, w: 0.4, d: 0.4, h: 0.75, build(g) {
    const metal = M(0x888f9a);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.19, 0], [0.19, 0.012], [0.04, 0.03], [0.0, 0.03]], M(0x3a3f48), 20);
    cyl(g, 0, 0.03, 0, 0.022, 0.022, 0.62, metal, 10);
    torus(g, 0, 0.3, 0, 0.13, 0.01, metal, -Math.PI / 2, 0, Math.PI * 2, 18);
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; rod(g, [0, 0.3, 0], [Math.cos(a) * 0.13, 0.3, Math.sin(a) * 0.13], 0.008, metal, 5); }
    lathe(g, 0, 0.64, 0, [[0.0, 0], [0.16, 0], [0.19, 0.04], [0.18, 0.09], [0.0, 0.1]], M(col(['#e8343e', '#3b3f4a', '#c8945a'])), 20);
  } },
  coffeemac: { name: 'コーヒーマシン', tier: 2, yen: 380000, w: 0.5, d: 0.4, h: 0.62, build(g) {
    const steel = M(0xd8dde4), dark = M(0x2a2f3a);
    rbox(g, 0, 0, 0, 0.48, 0.06, 0.38, 0.01, dark);
    rbox(g, 0, 0.06, -0.1, 0.48, 0.48, 0.18, 0.02, steel);
    rbox(g, 0, 0.44, 0.02, 0.48, 0.12, 0.38, 0.02, steel);
    box(g, 0, 0.06, 0.05, 0.36, 0.01, 0.2, texMat('drip', 32, 32, (c) => { c.fillStyle = '#5a5f6a'; c.fillRect(0, 0, 32, 32); c.fillStyle = '#2a2f3a'; for (let i = 0; i < 6; i++) c.fillRect(i * 6 + 1, 0, 3, 32); }), false);
    for (const x of [-0.11, 0.11]) { cyl(g, x, 0.37, 0.1, 0.035, 0.03, 0.07, dark, 12, false); rod(g, [x, 0.4, 0.1], [x, 0.4, 0.2], 0.008, dark, 6); lathe(g, x, 0.07, 0.1, [[0.0, 0], [0.03, 0], [0.04, 0.06], [0.0, 0.06]], M(0xffffff), 12); }
    plane(g, 0, 0.5, 0.211, 0.2, 0.06, screenMat('cmScr', 64, 20, (c) => { c.fillStyle = '#1a2a3a'; c.fillRect(0, 0, 64, 20); text(c, 'READY', 32, 10, 11, '#8ad8a0'); }));
    for (const x of [-0.19, 0.19]) cyl(g, x, 0.5, 0.21, 0.02, 0.02, 0.012, M(0xe8574a), 10, false).rotation.x = Math.PI / 2;
  } },
  displaytable: { name: '展示台', tier: 2, yen: 50000, w: 1.4, d: 0.8, h: 0.72, top: 0.72, build(g) {
    const c = col(['#f7f3ea', '#e8e2d6', '#c89a6a']);
    rbox(g, 0, 0, 0, 1.36, 0.08, 0.76, 0.02, M(0x8a7a6a));
    rbox(g, 0, 0.08, 0, 1.4, 0.6, 0.8, 0.03, M(c));
    rbox(g, 0, 0.68, 0, 1.44, 0.04, 0.84, 0.015, M(0x3a3f48));
    box(g, 0, 0.3, 0.401, 1.2, 0.04, 0.005, M(0xc8a85a), false);
  } },
  balloonstand: { name: 'ふうせん', tier: 3, yen: 5000, w: 0.5, d: 0.5, h: 2.2, solid: false, build(g) {
    lathe(g, 0, 0, 0, [[0.0, 0], [0.12, 0], [0.13, 0.06], [0.08, 0.12], [0.0, 0.13]], M(0x888f9a), 14);
    for (let i = 0; i < 6; i++) {
      const x = rr(-0.3, 0.3), z = rr(-0.3, 0.3), y = rr(1.55, 2.1), c = M(col(BRIGHT));
      const mid = [x * 0.5 + rr(-0.05, 0.05), (y + 0.12) / 2, z * 0.5];
      rod(g, [0, 0.12, 0], mid, 0.003, M(0xffffff), 4); rod(g, mid, [x, y - 0.19, z], 0.003, M(0xffffff), 4);
      lathe(g, x, y - 0.2, z, [[0.0, 0], [0.02, 0.01], [0.12, 0.08], [0.16, 0.2], [0.14, 0.3], [0.08, 0.36], [0.0, 0.38]], c, 16);
      sph(g, x - 0.05, y + 0.06, z + 0.09, 0.025, M(0xffffff, 0.6));
    }
  } },

  // ───────── tier 3：ベンチ・自販機など ─────────
  bench: { name: 'ベンチ', tier: 2, yen: 85000, w: 2.0, d: 0.66, h: 0.9, top: 0.46, build(g) {
    const wood = texMat('benchWood', 128, 16, (c, w, h) => { c.fillStyle = '#c08a52'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8743e'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 3 + i * 3.5); c.bezierCurveTo(40, 2 + i * 3.5, 80, 5 + i * 3.5, 128, 3 + i * 3.5); c.stroke(); } }), metal = M(0x3a3f48);
    for (const x of [-0.85, 0.85]) {
      rod(g, [x, 0, 0.25], [x, 0.42, 0.22], 0.025, metal, 8); rod(g, [x, 0, -0.25], [x, 0.42, -0.22], 0.025, metal, 8);
      rod(g, [x, 0.42, -0.26], [x, 0.9, -0.33], 0.025, metal, 8);
      rod(g, [x, 0.42, 0.26], [x, 0.62, 0.22], 0.022, metal, 8); rod(g, [x, 0.62, 0.22], [x, 0.62, -0.28], 0.022, metal, 8);
    }
    for (let i = 0; i < 4; i++) rbox(g, 0, 0.41, -0.22 + i * 0.15, 1.96, 0.04, 0.12, 0.012, wood);
    for (let i = 0; i < 3; i++) { const s = rbox(g, 0, 0.52 + i * 0.13, -0.29 - i * 0.017, 1.96, 0.1, 0.035, 0.012, wood); s.rotation.x = -0.14; }
  } },
  vending: { name: '自動販売機', tier: 3, yen: 650000, w: 1.0, d: 0.8, h: 1.95, build(g) {
    const v = Math.floor(rnd() * 4), body = ['#e8343e', '#3a7ad8', '#f2f2f2', '#2a9a5a'][v], name = ['NYA COLA', 'ねこ飲料', 'おいしい水', 'GREEN TEA'][v];
    rbox(g, 0, 0, 0, 0.98, 1.9, 0.78, 0.03, M(hex(body)));
    plane(g, 0, 1.32, 0.392, 0.86, 1.0, screenMat('vendF' + v, 128, 150, (c, w, h) => {
      c.fillStyle = '#eef4fb'; c.fillRect(0, 0, w, h);
      for (let r = 0; r < 3; r++) {
        c.fillStyle = '#c8d4e0'; c.fillRect(0, 44 + r * 48, w, 3);
        for (let k = 0; k < 6; k++) {
          const x = 8 + k * 20, y = 8 + r * 48, cc = ['#e8343e', '#3a7ad8', '#f2a93b', '#2a8a4a', '#3b3f4a', '#e86fa8'][(k + r * 2) % 6];
          c.fillStyle = cc; c.beginPath(); c.roundRect(x + 2, y + 6, 12, 28, 3); c.fill(); c.fillStyle = '#ffffff99'; c.fillRect(x + 4, y + 14, 3, 14);
          c.fillStyle = '#d8dde4'; c.fillRect(x + 4, y + 2, 8, 5);
          c.fillStyle = r === 0 && k === 2 ? '#e8343e' : '#5aa9f0'; c.beginPath(); c.roundRect(x + 1, y + 37, 14, 4, 2); c.fill();
        }
      }
    }));
    plane(g, 0, 1.86, 0.392, 0.86, 0.08, screenMat('vendT' + v, 128, 12, (c, w, h) => { c.fillStyle = body; c.fillRect(0, 0, w, h); text(c, name, w / 2, h / 2 + 1, 10, body === '#f2f2f2' ? '#3a7ad8' : '#ffffff'); }));
    box(g, 0.32, 0.62, 0.39, 0.16, 0.2, 0.02, M(0xc8ced8), false); box(g, 0.32, 0.68, 0.401, 0.02, 0.05, 0.002, M(0x1a1a22), false);
    plane(g, -0.15, 0.66, 0.401, 0.3, 0.12, screenMat('vendMoney', 64, 24, (c) => { c.fillStyle = '#15161c'; c.fillRect(0, 0, 64, 24); text(c, '¥ 0', 32, 12, 14, '#e8343e'); }));
    rbox(g, 0, 0.12, 0.33, 0.7, 0.22, 0.14, 0.02, M(0x1a1a22));
    box(g, 0, 0.1, 0.4, 0.64, 0.16, 0.005, M(0x3a3f48), false);
    rbox(g, 0, 1.9, 0, 0.98, 0.05, 0.78, 0.02, M(0x3a3f48));
  } },
  mannequin: { name: 'マネキン', tier: 3, yen: 150000, w: 0.6, d: 0.6, h: 1.85, build(g) {
    const skin = M(0xf2ead8), c = col(BRIGHT.concat(PASTEL)), cloth = M(c), v = rnd() < 0.5;
    lathe(g, 0, 0, 0, [[0.0, 0], [0.24, 0], [0.24, 0.025], [0.05, 0.035], [0.0, 0.035]], M(0x3b3f4a), 24);
    rod(g, [0, 0.03, 0], [0, 0.9, 0], 0.014, M(0x9aa0aa), 8);
    for (const s of [-1, 1]) { rod(g, [s * 0.08, 0.06, 0.02], [s * 0.075, 0.82, 0], 0.045, v ? skin : M(0x3b3f4a), 10); lathe(g, s * 0.08, 0.0, 0.05, [[0.0, 0], [0.04, 0], [0.03, 0.05], [0.0, 0.05]], M(0x2a2f3a), 10); }
    if (v) lathe(g, 0, 0.62, 0, [[0.0, 0], [0.28, 0], [0.2, 0.3], [0.15, 0.55], [0.17, 0.75], [0.12, 0.85], [0.0, 0.86]], cloth, 20);
    else lathe(g, 0, 0.8, 0, [[0.0, 0], [0.16, 0], [0.15, 0.2], [0.18, 0.5], [0.13, 0.62], [0.0, 0.64]], cloth, 20);
    for (const s of [-1, 1]) { rod(g, [s * 0.17, 1.38, 0], [s * 0.24, 1.0, 0.04], 0.04, cloth, 10); rod(g, [s * 0.24, 1.0, 0.04], [s * 0.22, 0.8, 0.1], 0.03, skin, 10); }
    cyl(g, 0, 1.44, 0, 0.04, 0.045, 0.08, skin, 10);
    sph(g, 0, 1.62, 0, 0.11, skin, 0.85, 1.12, 0.95);
    sph(g, 0, 1.66, -0.02, 0.115, M(col(['#3a2a22', '#c8945a', '#f2e0b0', '#1a1a22'])), 0.9, 1.05, 1);
  } },
  shelf: { name: '商品だな', tier: 3, yen: 120000, w: 3.0, d: 0.7, h: 1.9, top: [0.12, 0.72, 1.32], build(g) {
    const m = M(0xe8e2d6), board = M(0xd8dde4), v = Math.floor(rnd() * 4);
    const [cat, cc] = [['のみもの', '#3a7ad8'], ['おかし', '#e8574a'], ['日用品', '#2a8a4a'], ['冷凍食品', '#5aa9f0']][v];
    box(g, 0, 0, -0.3, 3.0, 1.75, 0.06, texMat('pegboard', 64, 64, (c, w, h) => { c.fillStyle = '#e8e2d6'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8c0b0'; for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) c.fillRect(x, y, 2, 2); }));
    for (const x of [-1.47, 1.47]) rbox(g, x, 0, 0, 0.06, 1.75, 0.7, 0.01, m);
    for (const y of [0.08, 0.68, 1.28]) { box(g, 0, y, 0.02, 2.9, 0.04, 0.66, board); box(g, 0, y - 0.04, 0.345, 2.9, 0.06, 0.012, texMat('price', 128, 16, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { c.fillStyle = '#f5d547'; c.fillRect(6 + i * 32, 2, 20, 12); text(c, '¥' + (98 + i * 50), 16 + i * 32, 8, 8, '#c03030'); } }), false); }
    rbox(g, 0, 1.75, 0.1, 3.0, 0.2, 0.08, 0.02, M(hex(cc)));
    plane(g, 0, 1.85, 0.141, 1.2, 0.17, texMat('shelfCat' + v, 192, 28, (c, w, h) => { c.fillStyle = cc; c.fillRect(0, 0, w, h); text(c, cat, w / 2, h / 2 + 1, 20, '#ffffff'); }));
  } },
  bookshelf: { name: '本だな', tier: 3, yen: 110000, w: 3.0, d: 0.6, h: 1.95, top: [0.12, 0.72, 1.32], build(g) {
    const wood = texMat('shelfWood', 64, 64, (c, w, h) => { c.fillStyle = '#9a6a42'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8a5a36'; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(0, i * 6); c.bezierCurveTo(20, i * 6 + 3, 40, i * 6 - 3, 64, i * 6); c.stroke(); } });
    box(g, 0, 0, -0.27, 3.0, 1.9, 0.06, wood); for (const x of [-1.47, 1.47]) box(g, x, 0, 0, 0.06, 1.9, 0.6, wood);
    for (const y of [0.08, 0.68, 1.28, 1.86]) box(g, 0, y, 0, 2.94, 0.04, 0.6, wood);
    rbox(g, 0, 1.9, 0.02, 3.06, 0.06, 0.64, 0.015, M(0x7a5232));
    // 奥にぎっしり並んだ背表紙（壊せる本とは別の飾り）
    for (const y of [0.12, 0.72, 1.32]) plane(g, 0, y + 0.13, -0.235, 2.9, 0.26, texMat('spines', 256, 24, (c, w, h) => { let x = 0; while (x < w) { const bw = 4 + Math.floor(Math.random() * 6); c.fillStyle = pick(['#3a6a9a', '#c8564a', '#2a8a4a', '#8a6ad8', '#f2a93b', '#3b3f4a', '#e86fa8', '#f7f0e0']); c.fillRect(x, 2 + Math.random() * 4, bw - 1, h); c.fillStyle = '#ffffff55'; c.fillRect(x + 1, 8, bw - 3, 2); x += bw; } }));
  } },
  fridge: { name: '冷蔵庫', tier: 3, yen: 280000, w: 0.8, d: 0.75, h: 1.9, build(g) {
    const c = M(col(['#f2f4f6', '#c8ced8', '#3b3f4a', '#f2d8d0'])), handle = M(0x9aa0aa);
    rbox(g, 0, 0, 0, 0.78, 1.88, 0.72, 0.05, c);
    box(g, 0, 1.22, 0.361, 0.76, 0.012, 0.005, M(0x888f9a), false); box(g, 0, 0.62, 0.361, 0.76, 0.012, 0.005, M(0x888f9a), false);
    for (const [y, h] of [[1.32, 0.42], [0.84, 0.3], [0.2, 0.3]]) rbox(g, 0.3, y, 0.375, 0.03, h, 0.03, 0.012, handle);
    plane(g, -0.2, 1.65, 0.362, 0.16, 0.06, screenMat('fridgeLogo', 64, 24, (x) => { x.fillStyle = '#5a5f6a'; x.fillRect(0, 0, 64, 24); text(x, '-18℃', 32, 12, 12, '#8ad8f0'); }));
    for (let i = 0; i < 3; i++) box(g, -0.25 + i * 0.12, 1.45 + (i % 2) * 0.05, 0.361, 0.08, 0.06, 0.004, M(col(BRIGHT)), false);
  } },
  showcase: { name: '冷蔵ショーケース', tier: 3, yen: 450000, w: 2.2, d: 0.9, h: 2.0, build(g) {
    const w = M(0xf2f4f6);
    rbox(g, 0, 0, 0, 2.2, 0.32, 0.9, 0.02, w); box(g, 0, 0.3, -0.4, 2.2, 1.6, 0.1, w); rbox(g, 0, 1.88, -0.05, 2.2, 0.12, 0.85, 0.02, w);
    for (const x of [-1.08, 1.08]) box(g, x, 0.3, 0, 0.04, 1.6, 0.9, w);
    for (const y of [0.32, 0.72, 1.12, 1.52]) box(g, 0, y, -0.05, 2.12, 0.02, 0.7, M(0xd8dde4), false);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) {
      const cc = M(col(['#e8343e', '#3a7ad8', '#f2a93b', '#2a8a4a', '#ffffff', '#f5d547'])), x = -0.9 + k * 0.225, y = 0.34 + r * 0.4;
      if (r % 2) { lathe(g, x, y, -0.05, [[0.0, 0], [0.045, 0], [0.045, 0.18], [0.025, 0.24], [0.0, 0.25]], cc, 10); }
      else rbox(g, x, y, -0.05, 0.14, 0.22, 0.1, 0.015, cc);
    }
    box(g, 0, 0.3, 0.42, 2.18, 1.58, 0.01, new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.15, depthWrite: false }), false);
    box(g, 0, 1.78, 0.43, 2.0, 0.05, 0.01, M(0xf4faff, 1), false);
    plane(g, 0, 1.94, 0.379, 1.2, 0.09, texMat('showcaseSign', 192, 16, (c, w, h) => { c.fillStyle = '#3a7ad8'; c.fillRect(0, 0, w, h); text(c, 'つめたい のみもの', w / 2, h / 2 + 1, 12, '#ffffff'); }));
  } },
  register: { name: 'レジカウンター', tier: 2, yen: 350000, w: 1.8, d: 0.8, h: 1.3, top: 1.0, build(g) {
    const body = M(col(['#f7f3ea', '#c89a6a']));
    rbox(g, 0, 0, 0, 1.8, 0.96, 0.8, 0.02, body); rbox(g, 0, 0.96, 0, 1.84, 0.04, 0.84, 0.01, M(0x3a3f48));
    box(g, 0, 0.05, 0.401, 1.8, 0.12, 0.005, M(0xe8574a), false);
    box(g, -0.4, 1.0, 0, 0.8, 0.01, 0.5, texMat('belt', 64, 16, (c, w, h) => { c.fillStyle = '#2a2f3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a3f48'; for (let i = 0; i < 8; i++) c.fillRect(i * 8, 0, 3, h); }), false);
    rbox(g, 0.5, 1.0, 0, 0.38, 0.12, 0.34, 0.02, M(0x3a3f48)); rbox(g, 0.5, 1.12, 0.02, 0.3, 0.03, 0.22, 0.006, M(0x9aa0aa));
    const scr = rbox(g, 0.5, 1.15, -0.12, 0.28, 0.18, 0.03, 0.01, M(0x2a2f3a)); scr.rotation.x = -0.2;
    plane(scr, 0, 0, 0.016, 0.24, 0.14, screenMat('regScr', 64, 40, (c) => { c.fillStyle = '#1a3a2a'; c.fillRect(0, 0, 64, 40); text(c, '¥1,280', 32, 20, 14, '#8ad8a0'); }));
    rbox(g, 0.15, 1.0, -0.2, 0.1, 0.12, 0.1, 0.02, M(0x1a1a22));
  } },
  counter: { name: 'カウンター', tier: 2, yen: 300000, w: 3.0, d: 0.8, h: 1.0, top: 1.0, build(g) {
    const panel = texMat('counterPanel', 128, 48, (c, w, h) => { c.fillStyle = '#8a5a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6a4228'; c.lineWidth = 3; for (let i = 0; i < 4; i++) c.strokeRect(4 + i * 32, 6, 26, h - 12); });
    box(g, 0, 0, 0, 3.0, 0.95, 0.8, panel); rbox(g, 0, 0.94, 0, 3.08, 0.06, 0.88, 0.015, M(0xf2ead8));
    rbox(g, 0, 0, 0.36, 3.0, 0.08, 0.1, 0.01, M(0x3a2a1a));
  } },
  ufo: { name: 'UFOキャッチャー', tier: 3, yen: 900000, w: 1.2, d: 1.2, h: 2.1, build(g) {
    const v = Math.floor(rnd() * 3), base = ['#e86fa8', '#4aa3e0', '#f2a93b'][v], c = M(hex(base));
    rbox(g, 0, 0, 0, 1.16, 0.82, 1.16, 0.04, c);
    plane(g, 0, 0.55, 0.581, 0.9, 0.2, texMat('ufoL' + v, 192, 40, (x, w, h) => { x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(0, 0, w, h, 10); x.fill(); text(x, 'UFO CATCHER', w / 2, h / 2 + 1, 20, base); }));
    box(g, 0.3, 0.1, 0.581, 0.25, 0.25, 0.01, M(0x1a1a22), false);
    for (const [x, col2] of [[-0.25, 0xe8343e], [-0.1, 0x5aa9f0]]) cyl(g, x, 0.75, 0.5, 0.035, 0.035, 0.03, M(col2), 12, false);
    rod(g, [-0.4, 0.82, 0.45], [-0.4, 0.95, 0.45], 0.012, M(0x2a2f3a), 6); sph(g, -0.4, 0.97, 0.45, 0.03, M(0xe8343e));
    const glass = new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.14, depthWrite: false });
    box(g, 0, 0.82, 0, 1.12, 1.06, 1.12, glass, false);
    for (const [x, z] of [[-0.56, -0.56], [0.56, -0.56], [-0.56, 0.56], [0.56, 0.56]]) rbox(g, x, 0.82, z, 0.06, 1.06, 0.06, 0.02, c);
    rbox(g, 0, 1.88, 0, 1.16, 0.22, 1.16, 0.04, c);
    box(g, 0, 1.9, 0.585, 1.0, 0.16, 0.01, M(0xfff0a0, 1), false);
    for (let i = 0; i < 8; i++) { const x = rr(-0.38, 0.38), z = rr(-0.38, 0.38); const b = sph(g, x, 0.95, z, 0.11, M(col(PASTEL))); sph(g, x - 0.06, 1.04, z, 0.035, b.material); sph(g, x + 0.06, 1.04, z, 0.035, b.material); }
    rod(g, [-0.5, 1.82, 0.1], [0.5, 1.82, 0.1], 0.015, M(0x9aa0aa), 6);
    rod(g, [0.15, 1.82, 0.1], [0.15, 1.45, 0.1], 0.006, M(0xd8d8d8), 5); cyl(g, 0.15, 1.38, 0.1, 0.04, 0.06, 0.07, M(0xd8d8d8), 12, false);
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; rod(g, [0.15 + Math.cos(a) * 0.05, 1.39, 0.1 + Math.sin(a) * 0.05], [0.15 + Math.cos(a) * 0.09, 1.28, 0.1 + Math.sin(a) * 0.09], 0.008, M(0xd8d8d8), 5); }
  } },
  sofa: { name: 'ソファ', tier: 2, yen: 220000, w: 2.0, d: 0.9, h: 0.85, top: 0.45, build(g) {
    const c = M(col(['#c8564a', '#4a6a9a', '#6a9a6a', '#c8a07a', '#8a6ad8'])), leg = M(0x4a3222);
    for (const [x, z] of [[-0.88, -0.36], [0.88, -0.36], [-0.88, 0.36], [0.88, 0.36]]) cyl(g, x, 0, z, 0.025, 0.02, 0.08, leg, 8, false);
    rbox(g, 0, 0.08, 0, 2.0, 0.24, 0.88, 0.05, c);
    for (const x of [-0.45, 0.45]) { rbox(g, x, 0.3, 0.06, 0.88, 0.14, 0.72, 0.06, c); rbox(g, x, 0.4, -0.3, 0.88, 0.42, 0.22, 0.08, c); }
    for (const s of [-1, 1]) rbox(g, s * 0.92, 0.08, 0, 0.18, 0.5, 0.88, 0.07, c);
    sph(g, -0.62, 0.55, -0.12, 0.14, M(col(PASTEL)), 1, 1, 0.4).rotation.z = 0.3;
  } },
  atm: { name: 'ATM', tier: 3, yen: 3000000, w: 0.9, d: 0.8, h: 1.65, build(g) {
    const body = M(0x3a7a6a);
    rbox(g, 0, 0, 0, 0.88, 1.62, 0.78, 0.03, body);
    const desk = rbox(g, 0, 0.88, 0.32, 0.8, 0.1, 0.3, 0.02, M(0x2a5a4a)); desk.rotation.x = 0.35;
    const scr = rbox(g, 0, 1.05, 0.3, 0.6, 0.38, 0.12, 0.02, M(0x222630)); scr.rotation.x = 0.35;
    plane(scr, 0, 0, 0.061, 0.5, 0.3, screenMat('atmScr', 96, 56, (c) => { c.fillStyle = '#e8f4f8'; c.fillRect(0, 0, 96, 56); c.fillStyle = '#2a6a5a'; c.fillRect(0, 0, 96, 12); text(c, 'いらっしゃいませ', 48, 6, 7, '#ffffff'); for (let i = 0; i < 4; i++) { c.fillStyle = '#3a8a7a'; c.beginPath(); c.roundRect(6 + (i % 2) * 46, 18 + Math.floor(i / 2) * 18, 40, 14, 3); c.fill(); text(c, ['お引出し', 'お預入れ', '残高照会', 'お振込'][i], 26 + (i % 2) * 46, 25 + Math.floor(i / 2) * 18, 7, '#ffffff'); } }));
    plane(g, 0, 1.45, 0.391, 0.7, 0.15, texMat('atmSign', 128, 28, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); text(c, 'ねこ銀行 ATM', w / 2, h / 2 + 1, 14, '#2a6a5a'); }));
    box(g, -0.28, 0.75, 0.391, 0.16, 0.025, 0.01, M(0x1a1a22), false); box(g, 0.25, 0.7, 0.391, 0.22, 0.04, 0.01, M(0x1a1a22), false);
  } },
  piano: { name: 'ピアノ', tier: 2, yen: 1200000, w: 1.55, d: 0.65, h: 1.3, build(g) {
    const k = M(0x15161c);
    rbox(g, 0, 0, -0.12, 1.5, 1.26, 0.38, 0.02, k);
    rbox(g, 0, 0.66, 0.1, 1.5, 0.08, 0.42, 0.015, k);
    box(g, 0, 0.74, 0.17, 1.36, 0.02, 0.18, texMat('keysP', 256, 32, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8c8c8'; for (let i = 0; i < 36; i++) c.fillRect(i * 7.1, 0, 1, h); c.fillStyle = '#1a1a22'; for (let i = 0; i < 36; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) c.fillRect(i * 7.1 + 4.5, 0, 4.5, h * 0.6); }), false);
    rbox(g, 0, 0.76, 0.0, 1.5, 0.12, 0.08, 0.01, k);
    for (const x of [-0.68, 0.68]) rbox(g, x, 0, 0.18, 0.08, 0.74, 0.08, 0.02, k);
    for (const x of [-0.06, 0, 0.06]) box(g, x, 0.03, 0.1, 0.03, 0.01, 0.08, M(0xd8b860), false);
    const music = box(g, 0, 0.9, -0.01, 0.6, 0.25, 0.02, M(0xf7f3ea), false); music.rotation.x = -0.25;
    sph(g, -0.55, 1.28, -0.1, 0.06, M(0xe8574a), 1, 0.5, 1);
  } },
  lamppost: { name: '街灯', tier: 4, yen: 220000, w: 0.5, d: 0.5, h: 4.4, build(g) {
    const m = M(0x2a3a3a);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.22, 0], [0.22, 0.1], [0.14, 0.2], [0.1, 0.5], [0.0, 0.5]], m, 12);
    cyl(g, 0, 0.5, 0, 0.06, 0.08, 3.3, m, 10);
    torus(g, 0, 3.8, 0.25, 0.25, 0.04, m, 0, Math.PI / 2, Math.PI, 12);
    lathe(g, 0, 3.62, 0.5, [[0.0, -0.05], [0.16, 0.0], [0.18, 0.1], [0.04, 0.16], [0.0, 0.16]], m, 12);
    lathe(g, 0, 3.38, 0.5, [[0.0, 0], [0.1, 0], [0.15, 0.2], [0.0, 0.24]], M(0xfff2c0, 1.2), 12);
    for (const y of [1.2, 2.6]) torus(g, 0, y, 0, 0.075, 0.015, m, Math.PI / 2, 0, Math.PI * 2, 12);
  } },
  poster: { name: 'ポスター看板', tier: 3, yen: 180000, w: 2.2, d: 0.5, h: 2.4, build(g, o) {
    const m = M(0x2a3a3a);
    for (const x of [-1.0, 1.0]) { cyl(g, x, 0, 0, 0.05, 0.05, 2.4, m, 10); rbox(g, x, 0, 0, 0.3, 0.06, 0.4, 0.02, m); }
    rbox(g, 0, 0.9, -0.03, 2.1, 1.45, 0.08, 0.02, M(0x3a3f48));
    rbox(g, 0, 2.38, -0.03, 2.2, 0.06, 0.12, 0.02, m);
    if (o.posterTex) plane(g, 0, 1.62, 0.012, 1.96, 1.3, basic(0xffffff, { map: o.posterTex, side: THREE.DoubleSide }));
    plane(g, 0, 1.0, 0.013, 1.0, 0.12, texMat('posterCap', 192, 24, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); text(c, 'ねこパンチモール', w / 2, h / 2 + 1, 14, '#2a4a7a'); }));
  } },

  // ───────── tier 4：車・噴水など ─────────
  car: { name: '展示車', tier: 3, yen: 3800000, w: 1.9, d: 4.3, h: 1.55, build(g, o) {
    const c = o.color ?? col(['#e8343e', '#3a7ad8', '#f2f2f2', '#f2c030', '#3b3f4a', '#5cbf6a']), body = M(c), dark = M(0x15161c);
    const glass = M(0x3a4a5a), chrome = M(0xd8dde4);
    rbox(g, 0, 0.28, 0, 1.84, 0.66, 4.2, 0.22, body);
    const cab = rbox(g, 0, 0.82, -0.25, 1.6, 0.62, 2.3, 0.28, body);
    for (const s of [-1, 1]) {
      box(g, s * 0.81, 0.98, -0.25, 0.01, 0.36, 2.0, glass, false);
      box(g, s * 0.812, 0.98, -0.25, 0.012, 0.36, 0.06, body, false);
      rbox(g, s * 0.95, 0.88, 0.6, 0.12, 0.08, 0.16, 0.03, body);
      box(g, s * 0.925, 0.55, -0.1, 0.01, 0.02, 3.4, chrome, false);
    }
    const wf = box(g, 0, 0.88, 0.93, 1.42, 0.5, 0.02, glass, false); wf.rotation.x = 0.85;
    const wr = box(g, 0, 0.9, -1.42, 1.42, 0.44, 0.02, glass, false); wr.rotation.x = -0.8;
    for (const [x, z] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]]) {
      const s = Math.sign(x), w = cyl(g, x + s * 0.12, 0.36, z, 0.36, 0.36, 0.24, dark, 20); w.rotation.z = Math.PI / 2; w.position.x = x + s * 0.12;
      const hub = cyl(g, x + s * 0.125, 0.36, z, 0.2, 0.2, 0.01, chrome, 12, false); hub.rotation.z = Math.PI / 2; hub.position.x = x + s * 0.125;
    }
    for (const s of [-1, 1]) { rbox(g, s * 0.62, 0.52, 2.08, 0.38, 0.14, 0.06, 0.04, M(0xfff6d0, 1.2)); rbox(g, s * 0.66, 0.6, -2.08, 0.32, 0.12, 0.06, 0.04, M(0xe8343e, 0.8)); }
    rbox(g, 0, 0.3, 2.12, 1.7, 0.16, 0.08, 0.04, M(0x2a2f3a)); rbox(g, 0, 0.3, -2.12, 1.7, 0.16, 0.08, 0.04, M(0x2a2f3a));
    box(g, 0, 0.42, 2.13, 0.6, 0.1, 0.03, M(0x1a1a22), false);
    plane(g, 0, 0.3, -2.165, 0.42, 0.12, texMat('plate', 64, 20, (x) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 20); x.strokeStyle = '#2a6a3a'; x.strokeRect(1, 1, 62, 18); text(x, 'ねこ 22-22', 32, 10, 10, '#2a6a3a'); }), Math.PI);
  } },
  kiosk: { name: 'クレープ屋台', tier: 4, yen: 1800000, w: 2.6, d: 1.8, h: 2.9, top: 1.05, build(g, o) {
    const c = hex(o.color || pick(['#f28aa0', '#5cbf6a', '#f2a93b', '#4aa3e0']));
    box(g, 0, 0, 0, 2.4, 1.05, 1.6, M(0xf7f3ea)); box(g, 0, 0.1, 0.81, 2.4, 0.3, 0.01, M(c), false);
    for (const [x, z] of [[-1.15, -0.75], [1.15, -0.75], [-1.15, 0.75], [1.15, 0.75]]) box(g, x, 1.05, z, 0.07, 1.4, 0.07, M(0xd8d8d8));
    for (let i = 0; i < 6; i++) box(g, -1.1 + i * 0.44, 2.45, 0, 0.44, 0.12, 1.85, M(i % 2 ? 0xffffff : c));
    box(g, 0, 2.57, 0, 2.6, 0.14, 1.85, M(c));
    plane(g, 0, 2.15, 0.9, 1.9, 0.48, signMat(o.label || 'クレープ', '#ffffff', '#c04a6a', 512, 128, 72));
    for (let i = 0; i < 4; i++) cyl(g, -0.8 + i * 0.5, 1.05, 0.4, 0.07, 0.04, 0.22, M(col(PASTEL)), 8, false);
  } },
  foodstall: { name: 'フードコートのお店', tier: 4, yen: 5000000, w: 4.2, d: 1.8, h: 3.4, build(g, o) {
    const c = hex(o.color || '#e8574a');
    box(g, 0, 0, 0, 4.0, 1.05, 1.0, M(0xf2ead8)); box(g, 0, 0, -0.75, 4.0, 3.2, 0.3, M(c));
    box(g, 0, 2.6, 0, 4.2, 0.6, 1.8, M(c)); plane(g, 0, 2.9, 0.91, 3.4, 0.5, signMat(o.label || 'ラーメン', '#ffffff', '#c03a2a', 512, 96, 64));
    box(g, -1.2, 1.05, -0.2, 0.6, 0.6, 0.4, M(0xb8c0cc)); box(g, 1.2, 1.05, -0.3, 0.8, 0.5, 0.3, M(0x888f9a));
    box(g, 0, 1.2, -0.59, 3.0, 0.9, 0.01, glow(0xfff2d0, 0.6), false);
  } },
  fountain: { name: '噴水', tier: 4, yen: 15000000, w: 5.4, d: 5.4, h: 3.6, top: 0.5, build(g) {
    const stone = M(0xd8d2c4), water = basic(0x7ac8f0, { transparent: true, opacity: 0.75 });
    cyl(g, 0, 0, 0, 2.7, 2.7, 0.5, stone, 32); cyl(g, 0, 0.5, 0, 2.45, 2.45, 0.02, water, 32, false);
    cyl(g, 0, 0, 0, 2.3, 2.3, 0.45, M(0x6ab0d8), 32, false);
    cyl(g, 0, 0.45, 0, 0.35, 0.5, 1.2, stone, 14); cyl(g, 0, 1.65, 0, 1.1, 0.8, 0.25, stone, 20); cyl(g, 0, 1.9, 0, 0.18, 0.25, 0.9, stone, 12);
    cyl(g, 0, 2.8, 0, 0.55, 0.4, 0.15, stone, 16);
    for (let i = 0; i < 3; i++) cyl(g, 0, 1.9 + i * 0.5, 0, 0.12 - i * 0.03, 0.2 - i * 0.04, 0.5, water, 10, false);
    sph(g, 0, 3.3, 0, 0.28, water, 1, 1.4, 1);
  } },
  xmastree: { name: 'クリスマスツリー', tier: 4, yen: 2500000, w: 3.0, d: 3.0, h: 5.2, build(g) {
    const lf = M(0x2f7a46); box(g, 0, 0, 0, 1.2, 0.6, 1.2, M(0xc8343e)); cyl(g, 0, 0.6, 0, 0.18, 0.22, 0.6, M(0x7a4a2a), 10);
    for (let i = 0; i < 4; i++) cyl(g, 0, 1.0 + i * 0.95, 0, 0.05, 1.45 - i * 0.3, 1.4, lf, 14);
    for (let i = 0; i < 26; i++) { const y = rr(1.2, 4.3), r = (1.45 - (y - 1.0) / 0.95 * 0.3) * 0.8 * (1 - ((y - 1.0) % 0.95) / 1.4), a = rr(0, 6.28); sph(g, Math.cos(a) * r, y, Math.sin(a) * r, 0.09, glow(col(['#f5d547', '#e8343e', '#4aa3e0', '#ffffff']), 0.7)); }
    sph(g, 0, 5.0, 0, 0.25, glow(0xffe060, 1.2), 1, 1, 0.4);
    for (let i = 0; i < 5; i++) box(g, rr(-1.2, 1.2), 0, rr(0.7, 1.3) * pick([-1, 1]), 0.4, 0.35, 0.4, M(col(BRIGHT)));
  } },
  bigbear: { name: '巨大くまぬいぐるみ', tier: 4, yen: 1500000, w: 2.2, d: 2.0, h: 3.2, build(g) {
    const c = M(0xc08a5a), l = M(0xf2dcc0);
    sph(g, 0, 0.95, 0, 0.95, c, 1, 1.05, 0.9); sph(g, 0, 0.9, 0.55, 0.55, l, 1, 1.1, 0.5);
    sph(g, 0, 2.3, 0, 0.72, c); sph(g, -0.55, 2.85, 0, 0.25, c); sph(g, 0.55, 2.85, 0, 0.25, c); sph(g, 0, 2.15, 0.6, 0.28, l, 1, 0.8, 0.6);
    sph(g, -0.25, 2.45, 0.62, 0.07, M(0x1a1a22)); sph(g, 0.25, 2.45, 0.62, 0.07, M(0x1a1a22)); sph(g, 0, 2.22, 0.78, 0.08, M(0x3a2a22));
    sph(g, -0.85, 1.2, 0.2, 0.32, c, 1, 1.4, 1); sph(g, 0.85, 1.2, 0.2, 0.32, c, 1, 1.4, 1); sph(g, -0.5, 0.3, 0.6, 0.35, c); sph(g, 0.5, 0.3, 0.6, 0.35, c);
    box(g, -0.35, 1.75, 0.55, 0.7, 0.18, 0.2, M(0xe8343e));
  } },
  palm: { name: 'ヤシの木', tier: 4, yen: 600000, w: 1.6, d: 1.6, h: 5.0, build(g) {
    box(g, 0, 0, 0, 1.4, 0.6, 1.4, M(0xd8d2c4));
    for (let i = 0; i < 7; i++) cyl(g, Math.sin(i * 0.4) * 0.08, 0.6 + i * 0.55, 0, 0.17, 0.21, 0.56, M(i % 2 ? 0x9a7a52 : 0x8a6a42), 10);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const f = box(g, Math.cos(a) * 0.9, 4.3, Math.sin(a) * 0.9, 1.8, 0.04, 0.45, M(0x4f9c56)); f.rotation.y = -a; f.rotation.z = -0.35; }
  } },
  stage: { name: 'イベントステージ', tier: 4, yen: 4000000, w: 5.0, d: 3.0, h: 3.6, top: 0.6, build(g) {
    box(g, 0, 0, 0, 5.0, 0.6, 3.0, M(0x3a3f48)); box(g, 0, 0.6, -1.4, 5.0, 3.0, 0.2, M(0x8a3a5a));
    plane(g, 0, 2.5, -1.29, 4.2, 0.9, signMat('ねこ祭り 開催中', '#ffe7a0', '#8a3a5a', 512, 112, 64));
    for (const x of [-2.4, 2.4]) box(g, x, 0.6, 1.3, 0.12, 2.6, 0.12, M(0x888f9a));
  } },

  // ───────── tier 5：かべ・エスカレーター ─────────
  wall: { name: 'かべ', tier: 5, yen: 2400000, w: 4, d: 0.6, h: 8, build(g, o) {
    const w = o.w || 4, h = o.h || 8, c = o.color || '#efe6d6';
    // 壁の面：大きなパネル目地（幅 2m ごと）。外壁（h 8）は上に窓の帯
    const key = c + '|' + w.toFixed(2) + '|' + h;
    const tex = WALL_TEX.get(key) || WALL_TEX.set(key, canvasTex(128, 256, (x, W, H) => {
      x.fillStyle = c; x.fillRect(0, 0, W, H); x.fillStyle = '#00000012'; x.fillRect(0, 0, 2, H); x.fillRect(0, 0, W, 2); x.fillRect(0, H / 2, W, 2);
      x.fillStyle = '#ffffff22'; x.fillRect(4, 4, W - 8, 30);
    })).get(key);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 2, h / 4);
    box(g, 0, 0, 0, w, h, 0.6, toon(0xffffff, 0, { map: tex }));
    if (o.stripe) { box(g, 0, h - 1.2, 0.31, w, 0.4, 0.02, toon(hex(o.stripe), 0, {}), false); box(g, 0, h - 0.25, 0, w + 0.02, 0.25, 0.7, toon(0xd8cfc0, 0, {}), false); }
    if (h >= 8) box(g, 0, 4.6, 0.31, w - 0.4, 1.6, 0.02, toon(0x8aa4bf, 0, {}), false);
    if (o.base !== false) { box(g, 0, 0, 0.31, w, 0.25, 0.02, toon(0x8a7a6a, 0, {}), false); box(g, 0, 0, -0.31, w, 0.25, 0.02, toon(0x8a7a6a, 0, {}), false); }
  } },
  glasswall: { name: 'ガラスのかべ', tier: 5, yen: 3200000, w: 4, d: 0.4, h: 8, build(g, o) {
    const w = o.w || 4, h = o.h || 8, f = toon(0x6a7480, 0, {});
    box(g, -w / 2 + 0.08, 0, 0, 0.16, h, 0.4, f); box(g, w / 2 - 0.08, 0, 0, 0.16, h, 0.4, f);
    box(g, 0, 0, 0, w, 0.3, 0.4, f); box(g, 0, h - 0.3, 0, w, 0.3, 0.4, f); box(g, 0, h * 0.45, 0, w, 0.12, 0.4, f);
    box(g, 0, 0.3, 0, w - 0.32, h - 0.6, 0.06, new THREE.MeshBasicMaterial({ color: 0xbfe2f5, transparent: true, opacity: 0.22, depthWrite: false }), false);
  } },
  header: { name: '店の看板', tier: 4, yen: 1600000, w: 6, d: 0.6, h: 2, solid: false, build(g, o) {
    const w = o.w || 6, c = hex(o.color || '#efe6d6');
    box(g, 0, 0, 0, w, o.h || 2, 0.6, toon(c, 0, {}));
    if (o.label) plane(g, 0, (o.h || 2) / 2, 0.32, w * 0.8, (o.h || 2) * 0.6, signMat(o.label, o.signBg || '#ffffff', o.signFg || '#333', 768, 160, 84));
  } },
  escalator: { name: 'エスカレーター', tier: 5, yen: 30000000, w: 2.4, d: 13.2, h: 6.4, build(g) {
    const side = M(0xc8ced8), rail = M(0x2a2f3a);
    const L = 9, H = 5, ang = Math.atan2(H, L), len = Math.hypot(L, H);
    const stepTex = canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#5a5f6a'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { c.fillStyle = '#7a808a'; c.fillRect(0, y, w, 3); c.fillStyle = '#f5d547'; c.fillRect(0, y, 4, 3); c.fillRect(w - 4, y, 4, 3); } });
    stepTex.wrapT = THREE.RepeatWrapping; stepTex.repeat.set(1, 4);
    const glass = new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
    for (const x of [-1.05, 1.05]) {
      const s = box(g, x, 0, 0, 0.18, 0.9, len, side); s.rotation.x = ang; s.position.set(x, H / 2 + 0.2, 0);
      const gl = box(g, x, 0, 0, 0.04, 0.9, len, glass, false); gl.rotation.x = ang; gl.position.set(x, H / 2 + 1.0, 0);
      const r = rbox(g, x, 0, 0, 0.14, 0.1, len, 0.04, rail); r.rotation.x = ang; r.position.set(x, H / 2 + 1.5, 0);
    }
    const under = box(g, 0, 0, 0, 2.1, 0.6, len, side); under.rotation.x = ang; under.position.set(0, H / 2 - 0.25, 0);
    const st = box(g, 0, 0, 0, 1.9, 0.05, len, toon(0xffffff, 0, { map: stepTex })); st.rotation.x = ang; st.position.set(0, H / 2 + 0.06, 0);
    rbox(g, 0, 0, 5.5, 2.4, 0.3, 2.0, 0.05, side); box(g, 0, 0.3, 5.5, 1.9, 0.01, 1.6, M(0x7a808a), false);
    rbox(g, 0, H - 0.2, -5.5, 2.6, 0.5, 2.2, 0.05, side);
    for (const z of [-5.9, -5.1]) rbox(g, 0, 0, z, 1.6, H - 0.2, 0.3, 0.05, side);
    plane(g, 0, H + 1.0, -5.8, 1.8, 0.5, signMat('↑ 2F', '#2a6a9a', '#ffffff', 256, 72, 48));
  } },
  bigsign: { name: '吊り看板', tier: 4, yen: 900000, w: 5, d: 0.5, h: 7, hitY: 5.4, solid: false, build(g, o) {
    rod(g, [-2, 6.8, 0], [-2, 9, 0], 0.03, M(0x888f9a)); rod(g, [2, 6.8, 0], [2, 9, 0], 0.03, M(0x888f9a));
    box(g, 0, 5.4, 0, 5, 1.4, 0.2, M(0x2a6a9a)); plane(g, 0, 6.1, 0.11, 4.6, 1.2, signMat(o.label || 'SALE', '#2a6a9a', '#ffffff', 640, 160, 92));
    plane(g, 0, 6.1, -0.11, 4.6, 1.2, signMat(o.label || 'SALE', '#2a6a9a', '#ffffff', 640, 160, 92), Math.PI);
  } },

  // ───────── tier 6：柱・時計塔 ─────────
  pillar: { name: '大黒柱', tier: 5, yen: 80000000, w: 1.8, d: 1.8, h: 11, build(g) {
    const m = M(0xe8e0d0); box(g, 0, 0, 0, 2.2, 0.6, 2.2, M(0xb8ad9a)); box(g, 0, 0.6, 0, 1.6, 9.6, 1.6, m);
    box(g, 0, 10.2, 0, 2.4, 0.8, 2.4, M(0xb8ad9a));
    for (let i = 0; i < 3; i++) box(g, 0, 2.5 + i * 3, 0, 1.66, 0.12, 1.66, M(0xc8a85a), false);
  } },
  clocktower: { name: '時計塔', tier: 5, yen: 150000000, w: 3.0, d: 3.0, h: 13, build(g, o) {
    const m = M(0xe8d8c0), r = M(0x8a3a3a);
    box(g, 0, 0, 0, 3.0, 1.0, 3.0, M(0xb8ad9a)); box(g, 0, 1.0, 0, 2.2, 8.0, 2.2, m);
    box(g, 0, 9.0, 0, 2.8, 2.6, 2.8, m); cyl(g, 0, 11.6, 0, 0.0, 2.2, 1.8, r, 4).rotation.y = Math.PI / 4;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2, x = Math.sin(a) * 1.41, z = Math.cos(a) * 1.41;
      plane(g, x, 10.3, z, 2.0, 2.0, basic(0xffffff, { map: o.clockTex, transparent: true, side: THREE.DoubleSide }), a);
    }
    for (let i = 0; i < 3; i++) box(g, 0, 3 + i * 2, 0, 2.26, 0.15, 2.26, M(0xc8a85a), false);
  } },
};

// 時計の文字盤
export const makeClockTex = () => canvasTex(256, 256, (g) => {
  g.fillStyle = '#fff8e8'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
  g.lineWidth = 10; g.strokeStyle = '#8a6a3a'; g.stroke();
  g.fillStyle = '#3a2a1a';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 96 - 5, 128 - Math.cos(a) * 96 - 5, 10, 10); }
  g.lineCap = 'round'; g.strokeStyle = '#3a2a1a'; g.lineWidth = 12;
  g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 50, 128 - 30); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 - 10, 128 - 88); g.stroke();
});
