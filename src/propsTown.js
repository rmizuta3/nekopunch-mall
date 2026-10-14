// モールの外の街（住宅街 → マンション街 → オフィス街 → 超高層ビル街）の建物
import * as THREE from 'three';
import { box, cyl, sph, rod, plane, cg } from './core/geometry.js';
import { toon } from './core/materials.js';
import { canvasTex } from './core/textures.js';
import { rnd, pick, rr } from './core/random.js';
import { M, BRIGHT, PASTEL, col, hex, glow, signMat } from './props.js';
import { rbox, lathe, ico, tube, disc, torus, loft, texMat, screenMat, text, stripes } from './core/shapes.js';

// ───── 窓のテクスチャ（4×4 マスで 1 枚。明かりのついた窓をまぜる）─────
function windowTex(kind, wall) {
  const t = canvasTex(256, 256, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const X = x * 64, Y = y * 64, lit = Math.random() < 0.2, curtain = Math.random() < 0.4;
      const glass = lit ? '#ffe9b0' : '#7f9cbc', hi = lit ? '#fff6d8' : '#a8c0d8';
      if (kind === 'grid') {   // 太い格子の枠とガラス（テレビ局の外壁）
        g.fillStyle = '#6f86a0'; g.fillRect(X, Y, 64, 64);
        g.fillStyle = '#ffffff33'; g.beginPath(); g.moveTo(X + 6, Y + 58); g.lineTo(X + 26, Y + 6); g.lineTo(X + 34, Y + 6); g.lineTo(X + 14, Y + 58); g.fill();
        g.fillStyle = wall; g.fillRect(X, Y, 64, 6); g.fillRect(X, Y, 6, 64); g.fillRect(X + 31, Y, 2, 64); g.fillRect(X, Y + 31, 64, 2);
        continue;
      }
      if (kind === 'office') {
        g.fillStyle = wall; g.fillRect(X, Y, 64, 64);
        g.fillStyle = '#6a7a8a'; g.fillRect(X, Y + 50, 64, 14);               // 階の境の帯
        const gr = g.createLinearGradient(X, Y, X + 64, Y + 50); gr.addColorStop(0, lit ? '#fff1c4' : '#6f8fb4'); gr.addColorStop(1, lit ? '#ffd890' : '#9ab8d8');
        g.fillStyle = gr; g.fillRect(X + 2, Y + 2, 60, 46);
        g.fillStyle = '#ffffff55'; g.beginPath(); g.moveTo(X + 6, Y + 46); g.lineTo(X + 20, Y + 2); g.lineTo(X + 28, Y + 2); g.lineTo(X + 14, Y + 46); g.fill();
        g.fillStyle = '#c8d0d8'; g.fillRect(X + 31, Y + 2, 2, 46);
      } else if (kind === 'res') {
        g.fillStyle = wall; g.fillRect(X, Y, 64, 64);
        g.fillStyle = '#c8c0b4'; g.fillRect(X, Y + 60, 64, 4);
        g.fillStyle = '#5a6470'; g.fillRect(X + 8, Y + 6, 48, 34);
        g.fillStyle = glass; g.fillRect(X + 10, Y + 8, 21, 30); g.fillRect(X + 33, Y + 8, 21, 30);
        g.fillStyle = hi; g.fillRect(X + 12, Y + 10, 5, 26);
        if (curtain) { g.fillStyle = lit ? '#f2c890' : '#e8d8c0'; g.fillRect(X + 10, Y + 8, 8, 30); g.fillRect(X + 46, Y + 8, 8, 30); }
        g.fillStyle = '#d8d2c8'; g.fillRect(X + 2, Y + 40, 60, 18);              // ベランダ
        g.fillStyle = '#b8b0a4'; for (let i = 0; i < 8; i++) g.fillRect(X + 4 + i * 7.5, Y + 42, 2, 14);
        g.fillStyle = '#a8a094'; g.fillRect(X + 2, Y + 40, 60, 3);
      } else {
        g.fillStyle = wall; g.fillRect(X, Y, 64, 64);
        g.fillStyle = '#d8d2c8'; g.fillRect(X + 14, Y + 12, 36, 34);
        g.fillStyle = glass; g.fillRect(X + 17, Y + 15, 14, 28); g.fillRect(X + 33, Y + 15, 14, 28);
        g.fillStyle = hi; g.fillRect(X + 19, Y + 17, 3, 24);
        if (curtain) { g.fillStyle = pick(['#f2d0d8', '#d8e8f2', '#f2e8c8']); g.fillRect(X + 17, Y + 15, 6, 28); g.fillRect(X + 41, Y + 15, 6, 28); }
        g.fillStyle = '#b8b0a4'; g.fillRect(X + 12, Y + 46, 40, 4);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// 壁の色ごとにテクスチャを作る（色を掛けると窓まで染まるので）
const winMats = new Map();
const winMat = (kind, color) => {
  const k = kind + color;
  if (!winMats.has(k)) winMats.set(k, toon(0xffffff, 0, { map: windowTex(kind, '#' + color.toString(16).padStart(6, '0')) }));
  return winMats.get(k);
};

// 窓つきの箱（面ごとに UV を広げて、窓が同じ大きさで並ぶようにする）。y は底面
function facade(p, x, y, z, w, h, d, kind, color, cell = 3) {
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0);
  const uv = geo.attributes.uv, face = [[d, h], [d, h], null, null, [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    if (!face[f]) { uv.setXY(k, 0.005, 0.995); continue; }   // 屋上・底は壁の色
    uv.setXY(k, uv.getX(k) * face[f][0] / (cell * 4), uv.getY(k) * face[f][1] / (cell * 4));
  }
  const m = new THREE.Mesh(geo, winMat(kind, color)); m.position.set(x, y, z); m.userData.outline = true; p.add(m); return m;
}
// 三角屋根（x 方向に w、高さ rh、奥行き d）
function gable(p, x, y, z, w, rh, d, m) {
  const geo = cg(`gable${w},${rh},${d}`, () => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, rh); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
  });
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.userData.outline = true; p.add(me); return me;
}
// 鉄骨のトラス（筒 4 面に 1 列ずつ、たて 4 段の X 字）
function latticeDraw(c, w, h) {
  c.strokeStyle = '#ffffff'; c.lineCap = 'square';
  const cw = w / 4, ch = h / 4;
  c.lineWidth = 7; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * cw, 0); c.lineTo(i * cw, h); c.stroke(); c.beginPath(); c.moveTo(0, i * ch); c.lineTo(w, i * ch); c.stroke(); }
  c.lineWidth = 4; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(i * cw, j * ch); c.lineTo((i + 1) * cw, (j + 1) * ch); c.moveTo((i + 1) * cw, j * ch); c.lineTo(i * cw, (j + 1) * ch); c.stroke(); }
}
const MORI = {};
const WALLS = ['#f2ece0', '#e8dcc8', '#d8e0e8', '#f0d8c8', '#e0e8d8', '#c8c0b8'];
const ROOFS = ['#8a3a3a', '#3a4a6a', '#5a5a5a', '#6a4a32', '#3a6a5a'];

export const TOWN_PROPS = {
  // ───────── tier 3 ─────────
  shed: { name: '物置', tier: 3, yen: 120000, w: 2.2, d: 1.4, h: 2.2, build(g) {
    const c = col(['#c8ced8', '#d8c8a8', '#a8b8a0']);
    const panel = texMat('shed' + c, 64, 64, (x) => { x.fillStyle = '#' + c.toString(16).padStart(6, '0'); x.fillRect(0, 0, 64, 64); x.fillStyle = '#00000018'; for (let i = 0; i < 64; i += 8) x.fillRect(i, 0, 2, 64); });
    box(g, 0, 0.08, 0, 2.2, 1.85, 1.4, panel);
    rbox(g, 0, 0, 0, 2.3, 0.1, 1.5, 0.02, M(0x5a5f6a));
    const roof = box(g, 0, 1.92, 0, 2.5, 0.08, 1.7, M(0x5a5f6a)); roof.rotation.x = 0.06;
    for (const x of [-0.52, 0.52]) { box(g, x, 0.15, 0.701, 1.0, 1.6, 0.01, M(0xd8dde4), false); rbox(g, x * 0.12, 0.85, 0.71, 0.04, 0.22, 0.03, 0.01, M(0x3a3f48)); }
  } },
  busstop: { name: 'バス停', tier: 3, yen: 300000, w: 3.0, d: 1.4, h: 2.6, build(g) {
    const m = M(0x4a5a6a);
    for (const x of [-1.4, 1.4]) rod(g, [x, 0, -0.55], [x, 2.4, -0.55], 0.05, m, 8);
    const roof = rbox(g, 0, 2.4, -0.1, 3.1, 0.1, 1.5, 0.04, m); roof.rotation.x = -0.05;
    box(g, 0, 0.3, -0.58, 2.8, 2.0, 0.03, new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.3, depthWrite: false }), false);
    plane(g, -0.8, 1.3, -0.56, 0.9, 1.3, texMat('busAd', 96, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f28aa0'); gr.addColorStop(1, '#f5d547'); c.fillStyle = gr; c.fillRect(0, 0, w, h); text(c, 'ねこパンチ', w / 2, 30, 14, '#ffffff'); text(c, 'モール', w / 2, 52, 18, '#ffffff'); c.fillStyle = '#1a1a22'; c.beginPath(); c.arc(w / 2, 92, 18, 0, 7); c.fill(); }));
    rbox(g, 0.3, 0.42, -0.35, 1.8, 0.06, 0.4, 0.02, M(0xc08a52)); for (const x of [-0.4, 1.0]) rod(g, [x, 0, -0.35], [x, 0.42, -0.35], 0.03, m, 6);
    rod(g, [1.9, 0, 0.45], [1.9, 2.3, 0.45], 0.04, m, 8);
    cyl(g, 1.9, 2.0, 0.45, 0.3, 0.3, 0.05, texMat('busSign', 64, 64, (c) => { c.fillStyle = '#2a8a4a'; c.beginPath(); c.arc(32, 32, 32, 0, 7); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(32, 32, 26, 0, 7); c.fill(); text(c, 'バス', 32, 34, 18, '#2a8a4a'); }), 20, false).rotation.x = Math.PI / 2;
    rbox(g, 1.9, 0.9, 0.45, 0.4, 0.55, 0.05, 0.02, M(0xffffff));
  } },

  // ───────── tier 4 ─────────
  pole: { name: '電柱', tier: 4, yen: 500000, w: 0.6, d: 0.6, h: 9.5, build(g) {
    const m = M(0x9a9a92), k = M(0x3a3f48);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.2, 0], [0.13, 9.2], [0.0, 9.3]], m, 12);
    for (const [y, w] of [[8.6, 1.8], [7.9, 1.4]]) { box(g, 0, y, 0, w, 0.12, 0.12, k); for (const x of [-w / 2 + 0.1, 0, w / 2 - 0.1]) cyl(g, x, y + 0.12, 0, 0.04, 0.05, 0.14, M(0xf2f2f2), 8, false); }
    cyl(g, 0.32, 6.6, 0.15, 0.24, 0.24, 0.7, M(0x7a7f88), 14); lathe(g, 0.32, 7.3, 0.15, [[0.24, 0], [0.0, 0.08]], M(0x7a7f88), 14);
    plane(g, 0, 2.2, 0.2, 0.22, 0.7, texMat('poleSign', 32, 96, (c) => { c.fillStyle = '#2a4a7a'; c.fillRect(0, 0, 32, 96); text(c, 'ね', 16, 22, 16, '#ffffff'); text(c, 'こ', 16, 46, 16, '#ffffff'); text(c, '町', 16, 70, 16, '#ffffff'); }));
    for (let i = 0; i < 6; i++) box(g, i % 2 ? 0.16 : -0.16, 2.8 + i * 0.6, 0, 0.18, 0.04, 0.04, k);
  } },
  streettree: { name: '街路樹', tier: 4, yen: 300000, w: 2.6, d: 2.6, h: 6.5, build(g) {
    const lf = [M(col(['#4f9c56', '#5cbf6a', '#3f8a4a', '#7aa84a'])), M(col(['#3f8a4a', '#6ab04a', '#4a9a52']))];
    disc(g, 0, 0.02, 0, 0.7, M(0x6a4a2a), 12); box(g, 0, 0, 0, 1.4, 0.08, 1.4, M(0x9a9a92), false);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.3, 0], [0.2, 0.3], [0.17, 2.6], [0.12, 3.4], [0.0, 3.5]], M(0x7a5a3a), 8);
    rod(g, [0, 2.6, 0], [0.6, 3.4, 0.2], 0.08, M(0x7a5a3a), 6); rod(g, [0, 2.8, 0], [-0.5, 3.6, -0.3], 0.08, M(0x7a5a3a), 6);
    for (const [x, y, z, r, k] of [[0, 4.3, 0, 1.5, 0], [0.9, 3.7, 0.4, 1.0, 1], [-0.8, 3.9, -0.4, 1.0, 1], [0.2, 5.4, 0.1, 1.0, 0], [-0.3, 4.6, 0.9, 0.9, 1]]) ico(g, x, y, z, r, lf[k], 1);
  } },
  signal: { name: '信号機', tier: 4, yen: 2000000, w: 0.6, d: 0.6, h: 5.6, build(g) {
    const m = M(0x7a7f88), k = M(0x2a2f3a);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.18, 0], [0.12, 0.2], [0.09, 5.4], [0.0, 5.45]], m, 10);
    rod(g, [0, 5.0, 0], [2.4, 5.0, 0], 0.06, m, 8);
    rbox(g, 1.6, 4.55, 0, 1.45, 0.45, 0.32, 0.06, k);
    [0xe8343e, 0xf2c030, 0x5cbf6a].forEach((c, i) => {
      const x = 1.15 + i * 0.45;
      const lit = i === 2; const l = cyl(g, x, 4.775, 0.16, 0.15, 0.15, 0.03, lit ? M(c, 1.2) : M(0x4a4f5a), 16, false); l.rotation.x = Math.PI / 2;
      const hood = torus(g, x, 4.775, 0.2, 0.16, 0.025, k, 0, 0, Math.PI, 10);
    });
    rbox(g, 0.25, 2.2, 0.15, 0.36, 0.7, 0.2, 0.04, k);
    for (const [y, c] of [[2.38, 0xe8343e], [2.05, 0x4a4f5a]]) plane(g, 0.25, y, 0.251, 0.24, 0.24, texMat('ped' + c, 32, 32, (x) => { x.fillStyle = '#1a1a22'; x.fillRect(0, 0, 32, 32); x.fillStyle = c === 0xe8343e ? '#e8343e' : '#3a5a4a'; x.beginPath(); x.arc(16, 7, 4, 0, 7); x.fill(); x.fillRect(12, 12, 8, 10); x.fillRect(12, 22, 3, 8); x.fillRect(17, 22, 3, 8); }));
  } },
  bus: { name: 'バス', tier: 4, yen: 25000000, w: 2.6, d: 11, h: 3.3, build(g) {
    const v = Math.floor(rnd() * 3), c = ['#5cbf6a', '#4aa3e0', '#f2a93b'][v], k = M(0x15161c), chrome = M(0xd8dde4);
    const side = texMat('busSide' + v, 256, 64, (x, w, h) => {
      x.fillStyle = '#f7f7f2'; x.fillRect(0, 0, w, h); x.fillStyle = c; x.fillRect(0, 40, w, 24); x.fillRect(0, 34, w, 3);
      x.fillStyle = '#3a4a5a'; for (let i = 0; i < 9; i++) x.fillRect(6 + i * 27.5, 6, 24, 24); x.fillStyle = '#ffffff44'; for (let i = 0; i < 9; i++) x.fillRect(8 + i * 27.5, 8, 6, 20);
      text(x, 'NEKO BUS', w / 2, 52, 14, '#ffffff');
    });
    const b = rbox(g, 0, 0.35, 0, 2.5, 2.85, 10.8, 0.25, side);
    box(g, 0, 1.2, 5.41, 2.2, 1.5, 0.02, M(0x3a4a5a), false); box(g, 0, 1.15, -5.41, 2.0, 1.0, 0.02, M(0x3a4a5a), false);
    plane(g, 0, 2.85, 5.425, 1.8, 0.35, screenMat('busDest', 128, 24, (x) => { x.fillStyle = '#15161c'; x.fillRect(0, 0, 128, 24); text(x, 'ねこ駅 ゆき', 64, 12, 14, '#f2a93b'); }));
    for (const s of [-1, 1]) { rbox(g, s * 0.9, 0.6, 5.4, 0.36, 0.18, 0.05, 0.05, M(0xfff6d0, 1.2)); rbox(g, s * 0.95, 0.65, -5.42, 0.3, 0.24, 0.04, 0.05, M(0xe8343e, 0.8)); }
    rbox(g, 0, 0.3, 5.42, 2.4, 0.3, 0.1, 0.05, k); rbox(g, 0, 0.3, -5.42, 2.4, 0.3, 0.1, 0.05, k);
    for (const z of [-3.6, 3.6]) for (const x of [-1.1, 1.1]) { const s = Math.sign(x); const w = cyl(g, x + s * 0.17, 0.52, z, 0.52, 0.52, 0.34, k, 20); w.rotation.z = Math.PI / 2; w.position.x = x + s * 0.17; const hub = cyl(g, x + s * 0.175, 0.52, z, 0.28, 0.28, 0.01, chrome, 14, false); hub.rotation.z = Math.PI / 2; hub.position.x = x + s * 0.18; }
    rbox(g, 0, 3.2, -1.5, 1.6, 0.25, 3.0, 0.08, M(0xd8dde4));
  } },
  truck: { name: 'トラック', tier: 4, yen: 9000000, w: 2.4, d: 7.6, h: 3.6, build(g) {
    const k = M(0x15161c), cab = M(col(['#e8574a', '#f2f2f2', '#4aa3e0', '#5cbf6a'])), chrome = M(0xd8dde4);
    rbox(g, 0, 0.35, 2.65, 2.3, 2.25, 2.1, 0.18, cab);
    box(g, 0, 1.45, 3.7, 2.0, 0.85, 0.02, M(0x3a4a5a), false);
    for (const s of [-1, 1]) { box(g, s * 1.151, 1.5, 2.85, 0.02, 0.7, 0.9, M(0x3a4a5a), false); rbox(g, s * 0.8, 0.6, 3.7, 0.36, 0.16, 0.05, 0.04, M(0xfff6d0, 1.2)); rod(g, [s * 1.15, 1.8, 3.4], [s * 1.35, 1.6, 3.5], 0.025, k, 6); rbox(g, s * 1.38, 1.3, 3.5, 0.06, 0.35, 0.2, 0.02, k); }
    rbox(g, 0, 0.3, 3.72, 2.3, 0.25, 0.1, 0.05, M(0x5a5f6a));
    const cargo = texMat('cargo', 256, 96, (x, w, h) => { x.fillStyle = '#f7f7f2'; x.fillRect(0, 0, w, h); x.fillStyle = '#d8dde4'; for (let i = 0; i < w; i += 16) x.fillRect(i, 0, 2, h); x.fillStyle = '#2a6a9a'; x.fillRect(0, h - 18, w, 10); text(x, 'ねこ運輸', w * 0.4, h * 0.42, 30, '#2a6a9a'); x.fillStyle = '#1a1a22'; x.beginPath(); x.arc(w * 0.82, h * 0.42, 18, 0, 7); x.fill(); x.beginPath(); x.moveTo(w * 0.82 - 16, h * 0.42 - 6); x.lineTo(w * 0.82 - 12, h * 0.42 - 26); x.lineTo(w * 0.82 - 4, h * 0.42 - 14); x.fill(); x.beginPath(); x.moveTo(w * 0.82 + 16, h * 0.42 - 6); x.lineTo(w * 0.82 + 12, h * 0.42 - 26); x.lineTo(w * 0.82 + 4, h * 0.42 - 14); x.fill(); });
    rbox(g, 0, 0.55, -1.05, 2.4, 3.0, 5.3, 0.06, cargo);
    box(g, 0, 0.35, -1.05, 2.0, 0.2, 5.6, M(0x2a2f3a));
    for (const z of [-2.7, -1.5, 2.65]) for (const x of [-1.05, 1.05]) { const s = Math.sign(x); const w = cyl(g, x + s * 0.16, 0.45, z, 0.45, 0.45, 0.32, k, 18); w.rotation.z = Math.PI / 2; w.position.x = x + s * 0.16; const hub = cyl(g, x + s * 0.165, 0.45, z, 0.24, 0.24, 0.01, chrome, 12, false); hub.rotation.z = Math.PI / 2; hub.position.x = x + s * 0.17; }
  } },
  torii: { name: '鳥居', tier: 4, yen: 8000000, w: 6.4, d: 1.4, h: 6.4, build(g) {
    const r = M(0xd8442e), k = M(0x2a2a2a);
    for (const x of [-2.2, 2.2]) { lathe(g, x, 0, 0, [[0.0, 0], [0.34, 0], [0.32, 0.5], [0.0, 0.5]], k, 14); lathe(g, x, 0.5, 0, [[0.28, 0], [0.24, 5.2], [0.0, 5.2]], r, 14); }
    rbox(g, 0, 4.4, 0, 5.4, 0.35, 0.36, 0.05, r);
    rbox(g, 0, 4.75, 0, 0.36, 0.8, 0.3, 0.04, r);
    plane(g, 0, 5.0, 0.2, 0.7, 0.9, texMat('toriiPlaque', 48, 64, (c) => { c.fillStyle = '#2a2a2a'; c.fillRect(0, 0, 48, 64); c.fillStyle = '#d8b860'; c.fillRect(4, 4, 40, 56); text(c, 'ね', 24, 20, 16, '#2a2a2a'); text(c, 'こ', 24, 44, 16, '#2a2a2a'); }));
    rbox(g, 0, 5.2, 0, 6.2, 0.42, 0.62, 0.08, r);
    const top = box(g, 0, 5.6, 0, 6.8, 0.35, 0.8, k);
    for (const s of [-1, 1]) { const tip = box(g, s * 3.45, 5.7, 0, 0.5, 0.25, 0.8, k); tip.rotation.z = s * 0.25; }
  } },

  // ───────── tier 5 ─────────
  house: { name: '一軒家', tier: 5, yen: 35000000, w: 10, d: 9, h: 9.5, build(g) {
    const W = rr(7, 9), D = rr(6.5, 7.8), two = rnd() < 0.75, H = two ? 5.8 : 3.1, wall = hex(pick(WALLS)), rc = pick(ROOFS);
    const roofTex = texMat('roof' + rc, 64, 64, (c) => { c.fillStyle = rc; c.fillRect(0, 0, 64, 64); c.fillStyle = '#00000026'; for (let y = 0; y < 64; y += 8) c.fillRect(0, y, 64, 2); c.fillStyle = '#ffffff14'; for (let y = 4; y < 64; y += 8) for (let x = (y / 4) % 2 * 6; x < 64; x += 12) c.fillRect(x, y, 1, 4); });
    rbox(g, 0, 0, 0, W + 0.4, 0.4, D + 0.4, 0.05, M(0xb8b0a4));
    facade(g, 0, 0.4, 0, W, H, D, 'house', wall, 2.4);
    if (two) box(g, 0, 0.4 + H / 2 - 0.1, 0, W + 0.1, 0.2, D + 0.1, M(0xd8d2c8), false);
    gable(g, 0, H + 0.4, 0, W + 1.0, 2.4, D + 1.0, roofTex);
    box(g, 0, H + 0.38, 0, W + 1.0, 0.12, D + 1.0, M(0xf2ece0), false);
    // 玄関
    const dx = W * 0.22;
    rbox(g, dx, 0.4, D / 2 - 0.02, 1.1, 2.1, 0.12, 0.03, M(col(['#6a4a32', '#3a4a6a', '#8a3a3a', '#f2ece0'])));
    sph(g, dx + 0.38, 1.4, D / 2 + 0.06, 0.05, M(0xd8b860));
    rbox(g, dx, 2.55, D / 2 + 0.45, 1.8, 0.1, 0.95, 0.03, M(0x5a5f6a));
    rbox(g, dx, 0, D / 2 + 0.55, 1.6, 0.4, 1.1, 0.03, M(0xc8c0b4));
    // ベランダ
    if (two && rnd() < 0.7) { const bx = -W * 0.2; rbox(g, bx, H * 0.5 + 0.35, D / 2 + 0.6, W * 0.45, 0.12, 1.2, 0.03, M(0xd8d2c8)); box(g, bx, H * 0.5 + 0.47, D / 2 + 1.18, W * 0.45, 0.9, 0.04, texMat('rail', 64, 32, (c) => { c.strokeStyle = '#5a5f6a'; c.lineWidth = 3; c.strokeRect(1, 1, 62, 30); for (let x = 6; x < 64; x += 6) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 32); c.stroke(); } }, { alphaTest: 0.5, side: THREE.DoubleSide }), false); }
    if (rnd() < 0.5) { rbox(g, -W * 0.3, H + 1.2, -D * 0.15, 0.6, 1.8, 0.6, 0.04, M(0x8a6a5a)); }
    // 塀と植え込み
    const fence = M(col(['#d8d2c4', '#a8a094', '#c8b8a0']));
    box(g, -W * 0.3, 0, D / 2 + 1.6, W * 0.5, 1.1, 0.2, fence); box(g, W * 0.42, 0, D / 2 + 1.6, W * 0.2, 1.1, 0.2, fence);
    for (let i = 0; i < 3; i++) ico(g, -W / 2 + 0.5 + i * 1.2, 0.7, D / 2 + 1.0, 0.6, M(0x4f9c56), 1);
    if (rnd() < 0.5) { lathe(g, W / 2 + 0.8, 0, -D * 0.2, [[0.0, 0], [0.15, 0], [0.1, 2.2], [0.0, 2.3]], M(0x7a5a3a), 6); ico(g, W / 2 + 0.8, 2.8, -D * 0.2, 1.2, M(col(['#4f9c56', '#7aa84a'])), 1); }
  } },
  konbini: { name: 'コンビニ', tier: 5, yen: 60000000, w: 16, d: 13, h: 5.5, build(g) {
    const v = Math.floor(rnd() * 3), [c1, c2] = [['#5cbf6a', '#4aa3e0'], ['#e8574a', '#f2a93b'], ['#4aa3e0', '#ffffff']][v];
    rbox(g, 0, 0, 0, 16, 4.8, 12, 0.08, M(0xf7f7f2));
    box(g, 0, 3.4, 6.01, 16, 0.5, 0.04, M(hex(c1)), false); box(g, 0, 2.9, 6.01, 16, 0.5, 0.04, M(hex(c2)), false);
    plane(g, 0, 1.45, 6.03, 14, 2.6, screenMat('konbiniIn' + v, 256, 48, (c, w, h) => {
      c.fillStyle = '#f4f8fc'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) { c.fillStyle = '#d8dde4'; c.fillRect(i * 21 + 2, 12, 17, 34); for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.fillStyle = pick(['#e8343e', '#3a7ad8', '#f2a93b', '#2a8a4a', '#f5d547', '#e86fa8']); c.fillRect(i * 21 + 3 + k * 5, 14 + r * 8, 4, 6); } }
      c.fillStyle = '#c8d4e0'; for (let i = 0; i < 7; i++) c.fillRect(i * 42, 0, 2, h); c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, 6);
    }));
    plane(g, 0, 4.3, 6.04, 6, 0.8, signMat('ねこマート', '#ffffff', c1, 512, 96, 70));
    rbox(g, 0, 4.8, 0, 16.3, 0.35, 12.3, 0.05, M(0x9a9fa8));
    rbox(g, 5.5, 4.85, -2, 2.5, 1.0, 1.6, 0.05, M(0xc8ced8)); rbox(g, -4, 4.85, -3, 1.2, 0.8, 1.2, 0.05, M(0xc8ced8));
    for (let i = 0; i < 3; i++) rbox(g, -7 + i * 0.9, 0, 6.6, 0.7, 1.0, 0.6, 0.06, M([0x5a8a6a, 0x4a6a9a, 0x8a8f9a][i]));
    for (let i = 0; i < 5; i++) box(g, -6 + i * 3, 0.01, 9.6, 0.15, 0.01, 4, M(0xf2f2f2), false);
  } },
  gasstation: { name: 'ガソリンスタンド', tier: 5, yen: 120000000, w: 22, d: 16, h: 7.4, build(g) {
    const red = M(0xe8343e), w = M(0xf7f7f2);
    rbox(g, 0, 6.0, 0, 18, 1.0, 12, 0.08, w); box(g, 0, 6.15, 6.01, 18, 0.55, 0.04, red, false); box(g, 0, 6.15, -6.01, 18, 0.55, 0.04, red, false);
    box(g, 0, 5.98, 0, 17.6, 0.02, 11.6, M(0xfff8e8, 0.8), false);
    for (const x of [-6, 0, 6]) {
      rbox(g, x, 0, 0, 0.6, 6.0, 0.6, 0.05, M(0xd8d8d8)); rbox(g, x, 0, 0, 1.8, 0.25, 7, 0.05, M(0xb8b0a4));
      for (const z of [2.4, -2.4]) {
        rbox(g, x, 0.25, z, 1.0, 1.9, 0.75, 0.06, red);
        plane(g, x, 1.5, z + (z > 0 ? 0.38 : -0.38), 0.7, 0.45, screenMat('pump', 64, 40, (c) => { c.fillStyle = '#15161c'; c.fillRect(0, 0, 64, 40); text(c, '¥168', 32, 14, 13, '#5aff9a'); c.fillStyle = '#f5d547'; c.fillRect(6, 26, 52, 8); }), z > 0 ? 0 : Math.PI);
        rod(g, [x + 0.5, 1.6, z], [x + 0.7, 0.9, z + 0.2], 0.03, M(0x1a1a22), 6);
      }
    }
    rbox(g, 0, 0, -7, 10, 4, 3, 0.08, w); box(g, 0, 0.3, -5.49, 6, 2.6, 0.02, M(0x8aa8c8), false); box(g, 0, 3.2, -5.48, 10, 0.5, 0.02, red, false);
    rod(g, [9.5, 0, 6.5], [9.5, 6.8, 6.5], 0.2, M(0x888f9a), 8);
    rbox(g, 9.5, 5.6, 6.5, 2.6, 2.6, 0.35, 0.06, red); plane(g, 9.5, 6.9, 6.68, 2.3, 2.3, texMat('gasSign', 128, 128, (c) => { c.fillStyle = '#e8343e'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(64, 54, 36, 0, 7); c.fill(); text(c, 'NYA', 64, 54, 26, '#e8343e'); text(c, 'OIL', 64, 108, 24, '#ffffff'); }));
  } },
  bigtree: { name: '大きな木', tier: 5, yen: 5000000, w: 8, d: 8, h: 14, build(g) {
    const lf = [M(col(['#3f8a4a', '#4f9c56', '#2f7a46'])), M(col(['#5a9a4a', '#4a8a3a', '#6ab04a']))], bark = M(0x6a4a2a);
    lathe(g, 0, 0, 0, [[0.0, 0], [1.3, 0], [0.9, 0.6], [0.7, 4], [0.5, 7], [0.0, 7.2]], bark, 10);
    for (const [a, b] of [[[0, 4.5, 0], [2.8, 7.5, 1.2]], [[0, 5, 0], [-2.6, 7.8, -0.8]], [[0, 5.5, 0], [0.5, 8.5, -2.4]], [[0, 6, 0], [-0.4, 9, 2.2]]]) rod(g, a, b, 0.32, bark, 6);
    for (const [x, y, z, r, k] of [[0, 9.6, 0, 3.8, 0], [2.9, 8.2, 1.2, 2.6, 1], [-2.7, 8.4, -0.8, 2.6, 1], [0.6, 8.6, -2.6, 2.4, 0], [-0.4, 8.8, 2.4, 2.4, 1], [0.4, 12.0, 0.2, 2.3, 0]]) ico(g, x, y, z, r, lf[k], 1);
  } },
  watertower: { name: '給水塔', tier: 5, yen: 80000000, w: 6, d: 6, h: 15, build(g) {
    const m = M(0x9aa8b8);
    for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { rod(g, [x, 0, z], [x * 0.6, 10, z * 0.6], 0.22, m, 8); lathe(g, x, 0, z, [[0.0, 0], [0.5, 0], [0.5, 0.4], [0.0, 0.4]], M(0x9a9a92), 8); }
    for (const y of [3.5, 7]) { const k = 1 - y / 10 * 0.4; for (const [a, b] of [[[-2, -2], [2, -2]], [[2, -2], [2, 2]], [[2, 2], [-2, 2]], [[-2, 2], [-2, -2]]]) rod(g, [a[0] * k, y, a[1] * k], [b[0] * k, y, b[1] * k], 0.1, m, 6); }
    lathe(g, 0, 9.6, 0, [[0.0, 0], [1.4, 0], [2.8, 0.6], [2.9, 1.0], [2.9, 4.2], [0.0, 4.2]], M(0xe0e8f0), 24);
    lathe(g, 0, 13.8, 0, [[3.0, 0], [0.4, 1.0], [0.0, 1.1]], m, 24);
    tube(g, 0, 11.2, 0, 2.92, 2.92, 1.4, texMat('wtBand', 256, 32, (c, w, h) => { c.fillStyle = '#e0e8f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a4a7a'; c.fillRect(0, 4, w, 24); text(c, 'ねこ町  ねこ町', w / 2, 16, 18, '#ffffff'); }), 24);
    torus(g, 0, 10.1, 0, 2.95, 0.06, m, Math.PI / 2, 0, Math.PI * 2, 32);
    rod(g, [2.9, 1, 0.3], [2.9, 10, 0.3], 0.05, m, 4); rod(g, [2.9, 1, -0.3], [2.9, 10, -0.3], 0.05, m, 4);
  } },

  // ───────── tier 6 ─────────
  apartment: { name: 'マンション', tier: 6, yen: 1500000000, w: 24, d: 14, h: 32, build(g) {
    const W = rr(16, 24), D = rr(10, 14), H = pick([18, 21, 24, 27, 30]), wall = hex(pick(WALLS));
    facade(g, 0, 0, 0, W, 3.6, D, 'office', 0xc8c0b4, 3.6);
    facade(g, 0, 3.6, 0, W, H - 3.6, D, 'res', wall, 3);
    rbox(g, 0, H, 0, W + 0.4, 0.6, D + 0.4, 0.1, M(0x9a9fa8));
    for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) box(g, x, 3.6, 0, 0.3, H - 3.6, D + 0.2, M(0xd8d2c8), false);
    rbox(g, 0, 0, D / 2 + 1.2, 5, 0.3, 2.4, 0.05, M(0xb8b0a4)); rbox(g, 0, 3.0, D / 2 + 1.2, 6, 0.3, 2.6, 0.05, M(0x5a5f6a));
    for (const x of [-2.6, 2.6]) rod(g, [x, 0, D / 2 + 2.3], [x, 3.0, D / 2 + 2.3], 0.08, M(0x5a5f6a), 6);
    plane(g, 0, 2.2, D / 2 + 0.02, 4, 0.7, texMat('aptName' + (Math.floor(rnd() * 3)), 128, 24, (c) => { c.fillStyle = '#3a3f48'; c.fillRect(0, 0, 128, 24); text(c, pick(['ネコハイツ', 'メゾン・ド・ニャン', 'グランにゃーる']), 64, 12, 13, '#f2e8c8'); }));
    lathe(g, W * 0.25, H + 0.6, -D * 0.2, [[0.0, 0], [1.4, 0], [1.4, 2.2], [0.0, 2.4]], M(0xc8ced8), 16);
    rbox(g, -W * 0.25, H + 0.6, 0, 3, 2.6, 3, 0.1, M(0xc8ced8));
  } },
  school: { name: '学校', tier: 6, yen: 3000000000, w: 60, d: 40, h: 22, build(g) {
    const track = texMat('track', 256, 160, (c, w, h) => { c.fillStyle = '#c89a6a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffffff'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(20 + i * 6, 20 + i * 6, w - 40 - i * 12, h - 40 - i * 12, 50 - i * 6); c.stroke(); } c.fillStyle = '#8ab86a'; c.beginPath(); c.roundRect(48, 48, w - 96, h - 96, 22); c.fill(); });
    plane(g, -6, 0.05, 10, 40, 18, track, 0, -Math.PI / 2);
    facade(g, 0, 0, -11, 56, 14, 13, 'house', 0xf2ece0, 3.5);
    rbox(g, 0, 14, -11, 56.4, 0.6, 13.4, 0.1, M(0xc8c0b4));
    rbox(g, 0, 14, -11, 8, 6.5, 8, 0.1, M(0xf2ece0)); rbox(g, 0, 20.5, -11, 8.4, 0.4, 8.4, 0.05, M(0x5a6a5a));
    plane(g, 0, 17.6, -6.94, 4.4, 4.4, texMat('schoolClock', 128, 128, (c) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#3a3f48'; c.stroke(); c.lineWidth = 8; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 22); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(96, 74); c.stroke(); }, { transparent: true }));
    plane(g, 0, 11.2, -4.47, 16, 2.2, texMat('schoolName', 256, 36, (c) => { c.fillStyle = '#f2ece0'; c.fillRect(0, 0, 256, 36); text(c, 'ねこ町立 ねこ小学校', 128, 18, 22, '#2a4a2a'); }));
    rbox(g, 0, 0, -4.0, 8, 0.4, 3, 0.05, M(0xb8b0a4)); rbox(g, 0, 3.6, -3.6, 9, 0.4, 3.6, 0.05, M(0x5a6a5a));
    rbox(g, 21, 0, 12, 16, 8, 14, 0.1, M(0xd8c8a8));
    const roof = tube(g, 21, 8, 12, 7.2, 7.2, 16.4, M(0x3a6a5a), 16); roof.rotation.z = Math.PI / 2; roof.position.set(29.2, 8, 12); roof.scale.set(0.35, 1, 1);
    for (const x of [-22, 10]) { box(g, x, 0, 10, 0.15, 2.4, 0.15, M(0xffffff)); box(g, x, 0, 13, 0.15, 2.4, 0.15, M(0xffffff)); box(g, x, 2.4, 11.5, 0.15, 0.15, 3.15, M(0xffffff)); }
    rod(g, [-26, 0, -2], [-26, 12, -2], 0.12, M(0xd8d8d8), 6); box(g, -25.3, 10.6, -2, 1.4, 1.0, 0.04, texMat('flag', 32, 24, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 32, 24); c.fillStyle = '#e8343e'; c.beginPath(); c.arc(16, 12, 7, 0, 7); c.fill(); }), false);
  } },
  hospital: { name: '病院', tier: 6, yen: 5000000000, w: 34, d: 24, h: 30, build(g) {
    facade(g, 0, 0, 0, 30, 26, 20, 'office', 0xf2f4f6, 3.5);
    rbox(g, 0, 26, 0, 30.4, 0.8, 20.4, 0.1, M(0xd8d8d8));
    plane(g, 0, 21, 10.03, 7, 7, texMat('redcross', 64, 64, (c) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(32, 32, 31, 0, 7); c.fill(); c.fillStyle = '#e8343e'; c.fillRect(24, 8, 16, 48); c.fillRect(8, 24, 48, 16); }, { transparent: true }));
    rbox(g, -9, 0, 11.5, 10, 4, 3, 0.1, M(0xd8e0e8)); rbox(g, -9, 4, 12, 12, 0.4, 5, 0.05, M(0x5a7a9a));
    plane(g, -9, 2.4, 13.02, 6, 1.0, texMat('hospName', 192, 32, (c) => { c.fillStyle = '#d8e0e8'; c.fillRect(0, 0, 192, 32); text(c, 'ねこ総合病院', 96, 16, 20, '#2a4a7a'); }));
    disc(g, 4, 26.82, 0, 6, texMat('heli', 128, 128, (c) => { c.fillStyle = '#4a5a6a'; c.beginPath(); c.arc(64, 64, 64, 0, 7); c.fill(); c.strokeStyle = '#f5d547'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.stroke(); text(c, 'H', 64, 68, 64, '#ffffff'); }), 24);
    rbox(g, -10, 26.8, -4, 4, 2.5, 4, 0.1, M(0xc8ced8));
  } },
  pylon: { name: '鉄塔', tier: 6, yen: 400000000, w: 10, d: 10, h: 40, build(g) {
    const lat = texMat('lattice', 128, 256, latticeDraw, { alphaTest: 0.5, side: THREE.DoubleSide, color: 0x9aa0a8 });
    const t1 = tube(g, 0, 0, 0, 2.6, 5.6, 24, lat, 4); t1.rotation.y = Math.PI / 4;
    const t2 = tube(g, 0, 24, 0, 0.8, 2.6, 14, lat, 4); t2.rotation.y = Math.PI / 4;
    for (const [y, w] of [[24, 16], [31, 12], [36.5, 8]]) { box(g, 0, y, 0, w, 0.5, 0.6, M(0x9aa0a8)); for (const x of [-w / 2 + 0.4, w / 2 - 0.4]) cyl(g, x, y - 1.6, 0, 0.15, 0.25, 1.6, M(0x5a5f6a), 8, false); }
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) rbox(g, x, 0, z, 1.4, 0.6, 1.4, 0.05, M(0x9a9a92));
  } },

  // ───────── tier 7 ─────────
  office: { name: 'オフィスビル', tier: 7, yen: 30000000000, w: 34, d: 34, h: 95, build(g) {
    const W = rr(24, 34), D = rr(24, 34), H = pick([50, 60, 70, 80, 90]), c = hex(pick(['#c8d4e0', '#d8d0c4', '#b8c8d8', '#e0e4e8', '#a8b4c4']));
    facade(g, 0, 0, 0, W + 1, 8, D + 1, 'office', 0x5a6470, 8);
    facade(g, 0, 8, 0, W, H - 8, D, 'office', c, 4);
    rbox(g, 0, H, 0, W + 0.6, 1.2, D + 0.6, 0.2, M(0x8a929c));
    if (rnd() < 0.5) { facade(g, 0, H + 1.2, 0, W * 0.6, H * 0.15, D * 0.6, 'office', c, 4); rbox(g, 0, H * 1.15 + 1.2, 0, W * 0.62, 0.8, D * 0.62, 0.2, M(0x8a929c)); }
    for (let i = 0; i < 3; i++) rbox(g, rr(-W * 0.3, W * 0.3), H + 1.2, rr(-D * 0.3, D * 0.3), rr(3, 6), rr(1.5, 3), rr(3, 6), 0.2, M(0xc8ced8));
    rbox(g, 0, 0, D / 2 + 3, W * 0.5, 0.3, 5, 0.1, M(0xb8b0a4)); rbox(g, 0, 6, D / 2 + 3, W * 0.5, 0.6, 6, 0.1, M(0x3a3f48));
    if (rnd() < 0.5) rod(g, [W * 0.2, H + 1.2, 0], [W * 0.2, H + 14, 0], 0.4, M(0xd8d8d8), 6);
  } },
  hotel: { name: 'ホテル', tier: 7, yen: 20000000000, w: 42, d: 26, h: 64, build(g) {
    facade(g, 0, 0, 0, 40, 10, 24, 'office', 0xc8a878, 5);
    facade(g, 0, 10, 0, 28, 48, 16, 'res', 0xf2ece0, 3);
    rbox(g, 0, 58, 0, 28.6, 1.2, 16.6, 0.2, M(0xc8a85a)); rbox(g, 0, 59.2, 0, 18, 4, 10, 0.2, M(0xf2ece0));
    plane(g, 0, 61.2, 5.02, 16, 3, texMat('hotelName', 256, 48, (c) => { c.fillStyle = '#c8a85a'; c.fillRect(0, 0, 256, 48); text(c, 'HOTEL NYAN', 128, 24, 32, '#ffffff'); }));
    rbox(g, 0, 10, 0, 40.4, 0.6, 24.4, 0.1, M(0xc8a85a));
    rbox(g, 0, 0, 13.5, 14, 0.4, 5, 0.1, M(0xb8b0a4)); rbox(g, 0, 5, 14.5, 16, 0.6, 7, 0.1, M(0x8a3a3a));
    for (const x of [-7, 7]) rod(g, [x, 0, 17.6], [x, 5, 17.6], 0.2, M(0xc8a85a), 8);
    for (let i = 0; i < 4; i++) { const x = -16 + i * 10.6; lathe(g, x, 0, 13, [[0.0, 0], [1.2, 0], [1.2, 1], [0.0, 1]], M(0xc8a85a), 12); ico(g, x, 1.6, 13, 1.1, M(0x4f9c56), 1); }
  } },
  ferris: { name: '観覧車', tier: 7, yen: 15000000000, w: 52, d: 16, h: 64, build(g) {
    const m = M(0xf2f2f2), st = M(0x9aa0a8), R = 28;
    for (const z of [-4, 4]) { rod(g, [-10, 0, z], [0, 32, z * 0.3], 0.9, st, 8); rod(g, [10, 0, z], [0, 32, z * 0.3], 0.9, st, 8); }
    rbox(g, 0, 0, 0, 26, 1.5, 12, 0.2, M(0xc8c0b4));
    const wheel = new THREE.Group(); wheel.position.set(0, 32, 0); g.add(wheel);
    for (const z of [-1.2, 1.2]) torus(wheel, 0, 0, z, R, 0.5, m, 0, 0, Math.PI * 2, 64);
    torus(wheel, 0, 0, 0, R * 0.55, 0.3, m, 0, 0, Math.PI * 2, 48);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; rod(wheel, [0, 0, 0], [Math.cos(a) * R, Math.sin(a) * R, 1.2], 0.18, m, 5); rod(wheel, [0, 0, 0], [Math.cos(a) * R, Math.sin(a) * R, -1.2], 0.18, m, 5); }
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, x = Math.cos(a) * R, y = Math.sin(a) * R, c = col(['#e8574a', '#f2a93b', '#f5d547', '#5cbf6a', '#4aa3e0', '#8a6ad8', '#e86fa8']);
      rod(wheel, [x, y, 0], [x, y - 1.2, 0], 0.12, st, 5);
      rbox(wheel, x, y - 4.2, 0, 2.8, 3.0, 2.8, 0.7, M(c)); box(wheel, x, y - 3.4, 0, 2.86, 1.1, 2.0, M(0x3a4a5a), false);
      lathe(wheel, x, y - 1.5, 0, [[1.5, 0], [0.4, 0.4], [0.0, 0.42]], M(c), 12);
    }
    cyl(wheel, 0, 0, -2.5, 2.4, 2.4, 5, M(0xe8574a), 20).rotation.x = Math.PI / 2;
    wheel.children[wheel.children.length - 1].position.set(0, 0, -2.5);
    rbox(g, 0, 0, 7.5, 8, 4, 4, 0.2, M(0xf2ece0)); plane(g, 0, 3.2, 9.52, 7, 1.0, texMat('ferrisSign', 128, 20, (c) => { c.fillStyle = '#e86fa8'; c.fillRect(0, 0, 128, 20); text(c, 'ねこ観覧車', 64, 10, 13, '#ffffff'); }));
  } },
  stadium: { name: 'スタジアム', tier: 7, yen: 50000000000, w: 120, d: 90, h: 32, build(g) {
    const seat = texMat('seats', 256, 32, (c, w, h) => { c.fillStyle = '#4a6a9a'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 4) for (let y = 0; y < h; y += 4) { c.fillStyle = Math.random() < 0.25 ? pick(['#e8574a', '#f5d547', '#ffffff', '#5cbf6a']) : '#3a5a8a'; c.fillRect(x, y, 3, 3); } }, { side: THREE.DoubleSide });
    const conc = M(0xd8d2c4);
    for (let i = 0; i < 4; i++) {
      const r0 = 50 + i * 6, ring = new THREE.Mesh(cg(`stadR${i}`, () => { const ge = new THREE.CylinderGeometry(r0 + 6, r0, 7.5, 48, 1, true); ge.translate(0, 3.75, 0); return ge; }), i === 3 ? conc : seat);
      ring.scale.set(1, 1, 0.72); ring.position.y = i * 7; ring.userData.outline = false; g.add(ring);
    }
    const outer = tube(g, 0, 0, 0, 74, 74, 30, texMat('stadWall', 256, 64, (c, w, h) => { c.fillStyle = '#e8e2d6'; c.fillRect(0, 0, w, h); c.fillStyle = '#5a6470'; for (let x = 0; x < w; x += 16) c.fillRect(x + 4, 10, 8, 40); }), 48); outer.scale.z = 0.72;
    const field = disc(g, 0, 0.2, 0, 50, texMat('pitch', 128, 128, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#5cbf6a' : '#4eae5c'; c.fillRect(i * 16, 0, 16, h); } c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.strokeRect(14, 30, 100, 68); c.beginPath(); c.moveTo(64, 30); c.lineTo(64, 98); c.stroke(); c.beginPath(); c.arc(64, 64, 12, 0, 7); c.stroke(); }), 48); field.scale.z = 0.72;
    for (const [x, z] of [[-60, -42], [60, -42], [-60, 42], [60, 42]]) { cyl(g, x, 0, z, 1.0, 1.4, 46, M(0x9aa0a8), 8); rbox(g, x, 46, z, 9, 4.5, 1.2, 0.2, M(0xfff6d0, 1.2)); }
  } },

  // ───────── tier 8 ─────────
  skyscraper: { name: '超高層ビル', tier: 8, yen: 300000000000, w: 52, d: 52, h: 230, build(g, o) {
    const W = rr(36, 50), D = rr(36, 50), H = o.height || pick([140, 160, 180, 200]), c = hex(pick(['#8aa4c4', '#a8b8cc', '#7a90a8', '#c8d0d8'])), trim = M(0x5a6470);
    facade(g, 0, 0, 0, W + 2, 12, D + 2, 'office', 0x3a4450, 12);
    facade(g, 0, 12, 0, W, H * 0.5, D, 'office', c, 5);
    rbox(g, 0, 12 + H * 0.5, 0, W + 1, 2, D + 1, 0.3, trim);
    facade(g, 0, 14 + H * 0.5, 0, W * 0.78, H * 0.28, D * 0.78, 'office', c, 5);
    rbox(g, 0, 14 + H * 0.78, 0, W * 0.8, 2, D * 0.8, 0.3, trim);
    facade(g, 0, 16 + H * 0.78, 0, W * 0.5, H * 0.12, D * 0.5, 'office', c, 5);
    const crown = 16 + H * 0.9;
    lathe(g, 0, crown, 0, [[W * 0.3, 0], [W * 0.3, 2], [W * 0.18, 10], [0.0, 12]], M(0xd8dde4), 4).rotation.y = Math.PI / 4;
    rod(g, [0, crown + 10, 0], [0, crown + 30, 0], 0.8, M(0xd8d8d8), 6); sph(g, 0, crown + 30, 0, 1.6, M(0xe8343e, 1.5));
    for (const s of [-1, 1]) for (const t of [-1, 1]) rod(g, [s * W * 0.25, crown + 2, t * D * 0.25], [s * W * 0.25, crown + 8, t * D * 0.25], 0.4, M(0xd8d8d8), 6);
  } },
  taiyo: { name: '太陽のねこ塔', tier: 7, yen: 40000000000, w: 34, d: 24, h: 72, build(g) {
    // 胴体：白地に赤い稲妻、おなかに「太陽の顔」（灰色）。旋盤の継ぎ目（u=0）が正面なので、正面の絵は両端に描く
    const body = texMat('taiyoBody', 512, 512, (c, w, h) => {
      c.fillStyle = '#f4f0e8'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d8342e'; c.lineWidth = 10; c.lineJoin = 'miter';
      for (const cx of [w * 0.2, w * 0.8]) { c.beginPath(); c.moveTo(cx, h * 0.27); for (let i = 1; i <= 8; i++) c.lineTo(cx + (i % 2 ? 26 : -26) * (cx < w / 2 ? 1 : -1), h * 0.27 + i * h * 0.085); c.stroke(); }
      const face = (fx) => {
        const fy = h * 0.52;
        c.fillStyle = '#8a8f96'; c.beginPath(); c.arc(fx, fy, 64, 0, 7); c.fill();
        c.fillStyle = '#a8adb4'; c.beginPath(); c.arc(fx, fy, 50, 0, 7); c.fill();
        c.strokeStyle = '#5a5f66'; c.lineWidth = 7; c.lineCap = 'round';
        c.beginPath(); c.moveTo(fx - 34, fy - 14); c.quadraticCurveTo(fx - 20, fy - 26, fx - 8, fy - 12); c.stroke();
        c.beginPath(); c.moveTo(fx + 8, fy - 12); c.quadraticCurveTo(fx + 20, fy - 26, fx + 34, fy - 14); c.stroke();
        c.beginPath(); c.moveTo(fx - 26, fy + 22); c.quadraticCurveTo(fx, fy + 40, fx + 26, fy + 22); c.stroke();
        c.beginPath(); c.moveTo(fx, fy - 6); c.lineTo(fx, fy + 12); c.stroke();
        c.strokeStyle = '#8a8f96'; c.lineWidth = 8; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; c.beginPath(); c.moveTo(fx + Math.cos(a) * 66, fy + Math.sin(a) * 66); c.lineTo(fx + Math.cos(a) * 82, fy + Math.sin(a) * 82); c.stroke(); }
      };
      face(0); face(w);
      // 背中の「黒い太陽」（u=0.5）
      const bx = w / 2, by = h * 0.4;
      c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(bx, by, 58, 0, 7); c.fill();
      c.strokeStyle = '#2a2a30'; c.lineWidth = 9; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; c.beginPath(); c.moveTo(bx + Math.cos(a) * 58, by + Math.sin(a) * 58); c.lineTo(bx + Math.cos(a + 0.15) * 84, by + Math.sin(a + 0.15) * 84); c.stroke(); }
      c.strokeStyle = '#6a8a9a'; c.lineWidth = 5; c.beginPath(); c.arc(bx - 20, by - 10, 9, 0, 7); c.stroke(); c.beginPath(); c.arc(bx + 20, by - 10, 9, 0, 7); c.stroke(); c.beginPath(); c.arc(bx, by + 20, 14, 0.2, 2.9); c.stroke();
    });
    lathe(g, 0, 0, 0, [[0.0, 0], [12, 0], [11.5, 3], [9.8, 12], [8.2, 24], [6.8, 36], [5.6, 44], [4.6, 52], [3.8, 58], [3.0, 64], [2.0, 68], [0.0, 69]], body, 32);
    disc(g, 0, 0.3, 0, 18, M(0xc8c0b4), 32);
    // 両腕：肩から横へのび、先が上を向く。上側に赤い線
    for (const s of [-1, 1]) {
      const w = M(0xf4f0e8), red = M(0xd8342e);
      rod(g, [s * 3.5, 46, 0], [s * 9, 47.5, 0], 2.6, w, 12); sph(g, s * 9, 47.5, 0, 2.6, w);
      rod(g, [s * 9, 47.5, 0], [s * 13, 53, 0], 2.0, w, 12); sph(g, s * 13, 53, 0, 2.0, w);
      rod(g, [s * 4, 48.4, 0.6], [s * 9, 49.9, 0.6], 0.4, red, 6); rod(g, [s * 9, 49.9, 0.6], [s * 12.4, 54.7, 0.6], 0.4, red, 6);
    }
    // てっぺんの「黄金の顔」（ねこ耳つき）
    const gold = texMat('taiyoGold', 256, 256, (c, w, h) => {
      c.fillStyle = '#e8b830'; for (let i = 0; i < 20; i++) { const a = i / 20 * 6.28, b = a + 0.16; c.beginPath(); c.moveTo(128 + Math.cos(a - 0.16) * 82, 128 + Math.sin(a - 0.16) * 82); c.lineTo(128 + Math.cos(a) * 126, 128 + Math.sin(a) * 126); c.lineTo(128 + Math.cos(b) * 82, 128 + Math.sin(b) * 82); c.fill(); }
      const gr = c.createRadialGradient(110, 110, 10, 128, 128, 90); gr.addColorStop(0, '#fff2a8'); gr.addColorStop(1, '#d8a020'); c.fillStyle = gr; c.beginPath(); c.arc(128, 128, 88, 0, 7); c.fill();
      c.fillStyle = '#2a2a30'; c.beginPath(); c.ellipse(96, 118, 16, 7, -0.2, 0, 7); c.fill(); c.beginPath(); c.ellipse(160, 118, 16, 7, 0.2, 0, 7); c.fill();
      c.strokeStyle = '#2a2a30'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(128, 120); c.lineTo(128, 150); c.stroke(); c.beginPath(); c.moveTo(100, 172); c.quadraticCurveTo(128, 162, 156, 172); c.stroke();
    }, { transparent: true, side: THREE.DoubleSide });
    const face = lathe(g, 0, 60, 3.2, [[0.0, 2.2], [3.8, 1.6], [5.6, 0.4], [5.8, 0.0]], M(0xe0b030), 24); face.rotation.x = Math.PI / 2;
    plane(g, 0, 60, 5.5, 15, 15, gold);
    for (const s of [-1, 1]) { const e = cyl(g, s * 3.6, 65, 3.6, 0, 1.6, 3.4, M(0xe0b030), 4); e.rotation.z = -s * 0.35; }
  } },
  fujitv: { name: 'ねこテレビ本社', tier: 8, yen: 500000000000, w: 120, d: 70, h: 128, build(g) {
    const frame = 0xdfe3e8, steel = M(frame);
    rbox(g, 0, 0, 0, 120, 10, 70, 0.6, M(0xc8c0b4));
    // 東西 2 棟（格子の外壁）
    for (const x of [-38, 38]) { facade(g, x, 10, 0, 40, 113, 46, 'grid', frame, 6); rbox(g, x, 123, 0, 41, 1.2, 47, 0.3, steel); }
    // 2 棟をつなぐ空中回廊（格子状）
    for (const y of [24, 48, 72]) for (const z of [-17, 17]) facade(g, 0, y, z, 36, 9, 10, 'grid', frame, 6);
    facade(g, 0, 108, -17, 36, 9, 10, 'grid', frame, 6);
    for (const z of [-17, 17]) for (const x of [-12, 0, 12]) box(g, x, 10, z, 1.6, 108, 1.6, steel);
    for (const y of [36, 60, 84, 96, 120]) for (const z of [-21, 21]) box(g, 0, y, z, 36, 1.2, 1.2, steel);
    // 球体展望室（パネルの線入り）
    const ball = texMat('fujiBall', 256, 128, (c, w, h) => { c.fillStyle = '#c4c9d0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9aa0a8'; c.lineWidth = 2; for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.fillStyle = '#ffffff40'; c.fillRect(20, 20, 60, 30); });
    sph(g, 0, 100, 8, 18, ball);
    torus(g, 0, 100, 8, 18.3, 0.5, steel, Math.PI / 2, 0, Math.PI * 2, 48);
    for (const [x, z] of [[-14, 0], [14, 0], [0, -10], [0, 18]]) rod(g, [x * 1.2, 82, 8 + z * 1.1], [x * 0.5, 87, 8 + z * 0.5], 1.0, steel, 8);
    box(g, 0, 80, 4, 36, 2, 40, steel);
    // 正面の大階段
    const stair = box(g, 0, 0, 0, 22, 1.5, 27, texMat('fujiStair', 32, 128, (c) => { c.fillStyle = '#c8c0b4'; c.fillRect(0, 0, 32, 128); c.fillStyle = '#a8a094'; for (let y = 0; y < 128; y += 6) c.fillRect(0, y, 32, 2); })); stair.rotation.x = 0.38; stair.position.set(0, 4.4, 47.5);
    plane(g, -38, 6, 35.02, 30, 4, texMat('fujiName', 256, 36, (c) => { c.fillStyle = '#c8c0b4'; c.fillRect(0, 0, 256, 36); text(c, 'ねこテレビ', 128, 18, 24, '#3a3f48'); }));
    for (let i = 0; i < 3; i++) { const e = sph(g, -50 + i * 6, 12, 33, 2.4, M([0xe8343e, 0x3a7ad8, 0xf2c030][i])); }
  } },
  azabudai: { name: 'ねこ台ヒルズ', tier: 8, yen: 800000000000, w: 100, d: 100, h: 335, build(g) {
    // ふもと：うねる屋上庭園の低層棟
    const green = [M(0x6ab04a), M(0x4f9c56), M(0x8ac05a)], terrace = M(0xd8cdb8);
    for (const [x, z, r, hgt] of [[-30, 26, 22, 14], [28, 30, 18, 11], [-34, -28, 16, 9], [32, -30, 20, 12]]) {
      for (let k = 0; k < 4; k++) { const rr2 = r * (1 - k * 0.2); lathe(g, x, k * hgt / 4, z, [[0.0, 0], [rr2, 0], [rr2 * 0.96, hgt / 4], [0.0, hgt / 4]], terrace, 24); ico(g, x + rr2 * 0.3, (k + 1) * hgt / 4, z - rr2 * 0.2, rr2 * 0.35, green[k % 3], 1, 1, 0.35, 1); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; ico(g, x + Math.cos(a) * r * 0.8, 2, z + Math.sin(a) * r * 0.8, 3.2, green[i % 3], 1, 1, 0.7, 1); }
    }
    disc(g, 0, 0.3, 0, 48, M(0xd8cdb8), 32);
    // タワー：角の丸い四角（ふくらんだ辺）の断面で、上へ行くほどわずかに細る。縦のフィン（ガラスの縦じま）
    if (!MORI.tex) {
      MORI.tex = canvasTex(64, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#9fb6cc'); gr.addColorStop(0.5, '#dce7f0'); gr.addColorStop(1, '#8aa2ba'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#f4f6f8'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 4, h); c.fillStyle = '#6a7e9466'; for (let y = 0; y < h; y += 16) c.fillRect(0, y, w, 1); });
      MORI.tex.wrapS = MORI.tex.wrapT = THREE.RepeatWrapping; MORI.tex.repeat.set(40, 20);
      MORI.mat = toon(0xffffff, 0, { map: MORI.tex });
    }
    loft(g, 0, 0, 0, [[31, 0], [31.6, 40], [32, 110], [31.2, 180], [29.4, 240], [27, 285], [25.2, 304]], MORI.mat, 3.2, 64);
    // 頂部：ガラスのフィンがせり上がる冠（ふたなし）
    loft(g, 0, 304, 0, [[25.2, 0], [25.6, 8], [26.4, 16]], texMat('moriCrown', 128, 32, (c, w, h) => { c.fillStyle = '#e8eef4'; c.fillRect(0, 0, w, h); c.fillStyle = '#a8bccc'; for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 2, h); }, { side: THREE.DoubleSide }), 3.2, 64, false);
    loft(g, 0, 304, 0, [[24.6, 0], [24.6, 2]], M(0x8a929c), 3.2, 64);
    for (let i = 0; i < 4; i++) rbox(g, rr(-10, 10), 306, rr(-10, 10), rr(4, 8), rr(2, 5), rr(4, 8), 0.4, M(0xc8ced8));
    rbox(g, 0, 0, 31, 30, 14, 4, 1, M(0x3a4450));
  } },
  windmill: { name: '風力発電', tier: 8, yen: 500000000, w: 30, d: 30, h: 200, build(g) {
    const w = M(0xf2f4f6);
    lathe(g, 0, 0, 0, [[0.0, 0], [12, 0], [12, 3], [6, 6], [3.2, 140], [0.0, 141]], w, 16);
    rbox(g, 0, 138, -3, 9, 9, 22, 3, w);
    sph(g, 0, 142.5, 8.5, 3.6, w, 1, 1, 1.4);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.3; const bl = rbox(g, 0, 0, 0, 5, 62, 1.6, 0.8, w); bl.position.set(Math.sin(a) * 31, 142.5 + Math.cos(a) * 31, 9.5); bl.rotation.z = -a; }
    box(g, 0, 141, -14, 3, 2, 0.4, M(0xe8343e), false);
  } },
  mountain: { name: '山', tier: 9, yen: 10000000000000, w: 700, d: 700, h: 420, build(g, o) {
    const k = o.k || 1, tex = texMat('mountainTex', 8, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, '#5a9a4a'); gr.addColorStop(0.45, '#4a7a3a'); gr.addColorStop(0.62, '#7a6a52'); gr.addColorStop(0.78, '#8a8278'); gr.addColorStop(0.8, '#f4f6f8'); gr.addColorStop(1, '#ffffff');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    const R = 340 * k, H = 400 * k * (o.tall || 1), seg = 7 + Math.floor(rnd() * 3);
    lathe(g, 0, 0, 0, [[0.0, 0], [R, 0], [R * 0.82, H * 0.12], [R * 0.6, H * 0.35], [R * rr(0.36, 0.44), H * 0.58], [R * 0.2, H * 0.82], [R * 0.06, H * 0.98], [0.0, H]], tex, seg).rotation.y = rr(0, 6);
    for (let i = 0; i < 3; i++) { const a = rr(0, 6.28), d = R * rr(0.55, 0.85); lathe(g, Math.cos(a) * d, 0, Math.sin(a) * d, [[0.0, 0], [R * 0.4, 0], [R * 0.22, H * 0.3], [0.0, H * 0.42]], tex, 6); }
    for (let i = 0; i < 10; i++) { const a = rr(0, 6.28), d = R * rr(0.75, 1.0); ico(g, Math.cos(a) * d, 12 * k, Math.sin(a) * d, rr(18, 30) * k, M(col(['#3f8a4a', '#4f9c56', '#2f7a46'])), 0); }
  } },
  fuji: { name: '富士山', tier: 9, yen: 99000000000000, w: 1500, d: 1500, h: 720, hp: 14, build(g) {
    const tex = texMat('fujiTex', 512, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#4a6a8a'); gr.addColorStop(0.6, '#3a5272'); gr.addColorStop(1, '#2e4462');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f8fafc'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, h * 0.3);
      for (let x = w; x >= 0; x -= 16) c.lineTo(x, h * (0.3 + (Math.sin(x * 0.11) * 0.5 + 0.5) * 0.14 + (x % 32 ? 0.05 : 0)));
      c.closePath(); c.fill();
    });
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([750 * Math.pow(1 - t, 1.8) + 90, 680 * t]); }
    pts.unshift([0.0, 0]); pts.push([60, 690], [0.0, 670]);
    lathe(g, 0, 0, 0, pts, tex, 40);
    for (let i = 0; i < 16; i++) { const a = rr(0, 6.28), d = rr(700, 820); ico(g, Math.cos(a) * d, 20, Math.sin(a) * d, rr(30, 50), M(col(['#3f8a4a', '#4f9c56'])), 0); }
  } },
  cloud: { name: '雲', tier: 9, yen: 1000000000, w: 420, d: 260, h: 160, solid: false, build(g) {
    const c = M(0xffffff, 0.35), sh = M(0xe4ecf4, 0.3);
    for (let i = 0; i < 7; i++) { const x = rr(-150, 150), z = rr(-80, 80), r = rr(60, 110); ico(g, x, r * 0.55, z, r, i % 3 ? c : sh, 1, 1.2, 0.75, 1); }
  } },
  tanker: { name: 'タンカー', tier: 9, yen: 20000000000, w: 90, d: 420, h: 90, build(g) {
    const hullTex = texMat('hull', 256, 32, (c, w, h) => { c.fillStyle = '#2a2f3a'; c.fillRect(0, 0, w, h * 0.55); c.fillStyle = '#b8342e'; c.fillRect(0, h * 0.55, w, h * 0.45); c.fillStyle = '#ffffff'; c.fillRect(0, h * 0.5, w, 2); text(c, 'NEKO MARU', 60, 9, 12, '#ffffff'); });
    box(g, 0, 0, 0, 64, 34, 360, hullTex);
    const bow = gable(g, 0, 0, 180, 64, 34, 1, hullTex); bow.rotation.set(Math.PI / 2, 0, 0); bow.scale.set(1, 1.6, 34); bow.position.set(0, 17, 180);
    for (let r = 0; r < 9; r++) for (let c2 = 0; c2 < 3; c2++) for (let h2 = 0; h2 < 2; h2++) box(g, -18 + c2 * 18, 34 + h2 * 12, 130 - r * 30, 16, 11, 26, M(col(['#e8574a', '#4aa3e0', '#f2c030', '#5cbf6a', '#f2f2f2', '#8a6ad8'])));
    rbox(g, 0, 34, -160, 56, 42, 30, 3, M(0xf2f4f6)); box(g, 0, 60, -146, 50, 8, 2, M(0x3a4a5a), false);
    lathe(g, 0, 76, -170, [[0.0, 0], [9, 0], [8, 22], [0.0, 22]], M(0xe8574a), 12);
  } },
  nekotower: { name: 'ねこタワー', tier: 8, yen: 1000000000000, w: 70, d: 70, h: 345, hp: 16, build(g) {
    const latO = texMat('latticeO', 128, 256, latticeDraw, { alphaTest: 0.5, side: THREE.DoubleSide, color: 0xe8582e });
    const latW = texMat('latticeW', 128, 256, latticeDraw, { alphaTest: 0.5, side: THREE.DoubleSide, color: 0xf7f2ea });
    const r = M(0xe8582e), w = M(0xf7f2ea);
    // 4 本足の土台（アーチ）
    for (const [x, z] of [[-30, -30], [30, -30], [-30, 30], [30, 30]]) { rbox(g, x, 0, z, 9, 3, 9, 0.5, M(0xb8b0a4)); }
    const secs = [[0, 45, 34, 50, latO], [45, 45, 24, 34, latW], [90, 45, 16, 24, latO], [135, 20, 12.5, 16, latW]];
    for (const [y, h, rt, rb, mat] of secs) { const t = tube(g, 0, y, 0, rt * 1.414, rb * 1.414, h, mat, 4); t.rotation.y = Math.PI / 4; }
    for (const y of [45, 90, 135]) { const k = y === 45 ? 34 : y === 90 ? 24 : 16; box(g, 0, y - 1, 0, k * 2 + 2, 2, k * 2 + 2, y === 90 ? r : w); }
    // 展望台
    facade(g, 0, 155, 0, 30, 12, 30, 'office', 0xf7f2ea, 3); rbox(g, 0, 154, 0, 32, 1.5, 32, 0.4, r); rbox(g, 0, 167, 0, 32, 1.5, 32, 0.4, r);
    const t2 = tube(g, 0, 168, 0, 5 * 1.414, 10 * 1.414, 60, latW, 4); t2.rotation.y = Math.PI / 4;
    facade(g, 0, 228, 0, 13, 7, 13, 'office', 0xf7f2ea, 2.5); rbox(g, 0, 227, 0, 14, 1, 14, 0.3, r); rbox(g, 0, 235, 0, 14, 1, 14, 0.3, r);
    for (let s = 0; s < 4; s++) cyl(g, 0, 236 + s * 18, 0, 3.6 - s * 0.7, 4.2 - s * 0.7, 18, s % 2 ? w : r, 12);
    // てっぺんの ねこ
    sph(g, 0, 318, 0, 12, M(0x1a1a22), 1, 0.95, 0.9);
    for (const s of [-1, 1]) { const e = cyl(g, s * 7, 325, 0, 0, 4.5, 11, M(0x1a1a22), 4); e.rotation.z = -s * 0.4; e.rotation.y = Math.PI / 4; sph(g, s * 4.5, 318, 10.2, 2.2, M(0xffd84a, 1.4)); }
    box(g, 0, 307, 0, 18, 2, 18, M(0xf7f7f2));
    rod(g, [0, 328, 0], [0, 345, 0], 0.6, M(0xd8d8d8), 6); sph(g, 0, 345, 0, 1.4, M(0xe8343e, 1.5));
  } },
};
