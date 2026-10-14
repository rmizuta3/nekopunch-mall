// ねこ部屋（スタート地点）の家具・小物と、モールに足した物
import * as THREE from 'three';
import { box, cyl, sph, rod, plane, cg } from './core/geometry.js';
import { basic } from './core/materials.js';
import { rnd, pick, rr } from './core/random.js';
import { M, BRIGHT, PASTEL, col, hex, glow, signMat } from './props.js';
import { rbox, lathe, ico, tube, disc, torus, texMat, screenMat, text, stripes } from './core/shapes.js';

export const ROOM_PROPS = {
  // ───────── tier 1 ─────────
  mug: { name: 'マグカップ', tier: 1, yen: 800, w: 0.12, d: 0.12, h: 0.1, build(g) {
    const v = Math.floor(rnd() * 4), base = ['#ffffff', '#f7c6c7', '#bfe0f5', '#fbe3a6'][v];
    lathe(g, 0, 0, 0, [[0.0, 0], [0.036, 0], [0.04, 0.004], [0.042, 0.09], [0.038, 0.09], [0.036, 0.012], [0.0, 0.012]], M(hex(base)), 18);
    tube(g, 0, 0.02, 0, 0.0425, 0.0415, 0.05, texMat('mug' + v, 128, 40, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a22'; for (const x of [32, 96]) { c.beginPath(); c.arc(x, 24, 10, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - 10, 18); c.lineTo(x - 8, 6); c.lineTo(x - 2, 15); c.fill(); c.beginPath(); c.moveTo(x + 10, 18); c.lineTo(x + 8, 6); c.lineTo(x + 2, 15); c.fill(); c.fillStyle = '#f2c030'; c.fillRect(x - 5, 22, 3, 3); c.fillRect(x + 2, 22, 3, 3); c.fillStyle = '#1a1a22'; } }), 18);
    disc(g, 0, 0.078, 0, 0.036, M(0x5a3420), 16);
    torus(g, 0.048, 0.046, 0, 0.022, 0.006, M(hex(base)), 0, 0, Math.PI * 2, 12);
  } },
  mikan: { name: 'みかん', tier: 1, yen: 60, w: 0.08, d: 0.08, h: 0.07, build(g) {
    sph(g, 0, 0.031, 0, 0.035, M(0xf28a1a), 1, 0.85, 1);
    cyl(g, 0, 0.058, 0, 0.004, 0.006, 0.006, M(0x5a6a2a), 6, false);
    const l = sph(g, 0.012, 0.062, 0, 0.012, M(0x3f8a4a), 1.4, 0.25, 0.7); l.rotation.z = -0.4;
  } },
  remote: { name: 'リモコン', tier: 1, yen: 2000, w: 0.18, d: 0.06, h: 0.03, build(g) {
    const r = rbox(g, 0, 0, 0, 0.17, 0.022, 0.05, 0.01, M(0x2a2f3a));
    box(g, 0, 0.022, 0, 0.15, 0.001, 0.04, texMat('remote', 128, 32, (c, w, h) => {
      c.fillStyle = '#2a2f3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8343e'; c.beginPath(); c.arc(10, 16, 6, 0, 7); c.fill();
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { c.fillStyle = '#9aa0aa'; c.fillRect(30 + i * 14, 4 + j * 9, 10, 6); }
      c.fillStyle = '#5aa9f0'; c.beginPath(); c.arc(100, 16, 10, 0, 7); c.fill(); c.fillStyle = '#2a2f3a'; c.beginPath(); c.arc(100, 16, 4, 0, 7); c.fill();
    }), false);
  } },
  tissue: { name: 'ティッシュ箱', tier: 1, yen: 300, w: 0.24, d: 0.12, h: 0.13, build(g) {
    const v = Math.floor(rnd() * 3);
    box(g, 0, 0, 0, 0.23, 0.08, 0.12, texMat('tissue' + v, 128, 64, (c, w, h) => {
      c.fillStyle = ['#f7f3ea', '#e8f4f8', '#fbeef2'][v]; c.fillRect(0, 0, w, h);
      c.fillStyle = ['#8ac8a0', '#5aa9f0', '#f28aa0'][v]; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(8 + i * 14, h - 10 - (i % 2) * 8, 5, 0, 7); c.fill(); }
      text(c, 'soft', w / 2, 18, 16, '#6a7a8a');
    }), false);
    box(g, 0, 0.0801, 0, 0.13, 0.001, 0.035, M(0xd8d2c8), false);
    const t1 = sph(g, -0.01, 0.1, 0, 0.035, M(0xffffff), 1.3, 0.8, 0.4); t1.rotation.z = 0.3;
    sph(g, 0.02, 0.105, 0.004, 0.025, M(0xffffff), 1, 1.2, 0.35).rotation.z = -0.3;
  } },
  clock: { name: '目覚まし時計', tier: 1, yen: 2500, w: 0.14, d: 0.1, h: 0.17, build(g) {
    const c = M(col(['#e8343e', '#4aa3e0', '#f5d547', '#5cbf6a']));
    const body = cyl(g, 0, 0.075, -0.02, 0.058, 0.058, 0.045, c, 20, false); body.rotation.x = Math.PI / 2;
    const face = plane(g, 0, 0.075, 0.026, 0.096, 0.096, texMat('clockFace', 64, 64, (x, w, h) => {
      x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill();
      x.fillStyle = '#333'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; x.fillRect(32 + Math.sin(a) * 25 - 1.5, 32 - Math.cos(a) * 25 - 1.5, 3, 3); }
      x.strokeStyle = '#333'; x.lineWidth = 3; x.beginPath(); x.moveTo(32, 32); x.lineTo(32, 14); x.stroke(); x.lineWidth = 2; x.beginPath(); x.moveTo(32, 32); x.lineTo(46, 38); x.stroke();
      x.strokeStyle = '#e8343e'; x.lineWidth = 1; x.beginPath(); x.moveTo(32, 32); x.lineTo(20, 48); x.stroke();
    }, { transparent: true }));
    torus(g, 0, 0.075, 0.026, 0.051, 0.006, M(0xd8dde4), 0, 0, Math.PI * 2, 20);
    for (const s of [-1, 1]) { const b = lathe(g, s * 0.035, 0.125, -0.02, [[0.0, 0], [0.026, 0], [0.0, 0.022]], M(0xd8dde4), 14); b.rotation.z = -s * 0.5; sph(g, s * 0.04, 0.009, 0.0, 0.009, M(0x3a3f48)); }
    rod(g, [-0.035, 0.15, -0.02], [0.035, 0.15, -0.02], 0.004, M(0xd8dde4)); sph(g, 0, 0.153, -0.02, 0.008, M(0xd8dde4));
  } },
  snack: { name: 'お菓子', tier: 1, yen: 150, w: 0.16, d: 0.08, h: 0.22, build(g) {
    const v = Math.floor(rnd() * 4), [bg, fg, name] = [['#e8343e', '#f5d547', 'ポテト'], ['#f2a93b', '#5a3420', 'チョコ'], ['#4aa3e0', '#ffffff', 'ラムネ'], ['#5cbf6a', '#ffffff', 'のり塩']][v];
    const mat = texMat('snack' + v, 64, 96, (c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.beginPath(); c.arc(w / 2, h * 0.62, 18, 0, 7); c.fill();
      c.fillStyle = bg; c.beginPath(); c.arc(w / 2 - 6, h * 0.6, 4, 0, 7); c.arc(w / 2 + 7, h * 0.66, 4, 0, 7); c.fill();
      text(c, name, w / 2, h * 0.28, 14, fg); for (let x = 0; x < w; x += 6) { c.fillStyle = '#00000033'; c.fillRect(x, 0, 3, 6); c.fillRect(x, h - 6, 3, 6); }
    });
    sph(g, 0, 0.105, 0, 0.075, mat, 1, 1.35, 0.42);
    box(g, 0, 0.0, 0, 0.13, 0.03, 0.03, mat, false); box(g, 0, 0.19, 0, 0.13, 0.03, 0.025, mat, false);
  } },
  yarn: { name: '毛糸玉', tier: 1, yen: 500, w: 0.14, d: 0.14, h: 0.13, build(g) {
    const c = M(col(['#e86fa8', '#4aa3e0', '#f5d547', '#5cbf6a', '#e8574a', '#c890f0']));
    sph(g, 0, 0.06, 0, 0.058, c);
    for (let i = 0; i < 5; i++) { const t = torus(g, 0, 0.06, 0, 0.058, 0.0045, c, rr(0, 3), rr(0, 3), Math.PI * 2, 18); t.rotation.z = rr(0, 3); }
    const pts = []; for (let i = 0; i <= 8; i++) pts.push([0.05 + i * 0.022, 0.006 + Math.max(0, 0.03 - i * 0.012), Math.sin(i * 0.9) * 0.02]);
    for (let i = 0; i < pts.length - 1; i++) rod(g, pts[i], pts[i + 1], 0.004, c, 5);
  } },
  catfood: { name: 'ねこ缶', tier: 1, yen: 180, w: 0.1, d: 0.1, h: 0.05, build(g) {
    const v = Math.floor(rnd() * 3), [bg, name] = [['#e8574a', 'まぐろ'], ['#4aa3e0', 'かつお'], ['#f2a93b', 'チキン']][v];
    lathe(g, 0, 0, 0, [[0.0, 0], [0.044, 0], [0.047, 0.004], [0.047, 0.006]], M(0xd8dde4), 18);
    tube(g, 0, 0.006, 0, 0.047, 0.047, 0.03, texMat('cat' + v, 128, 32, (c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(0, 3, w, 2); c.fillRect(0, h - 5, w, 2);
      for (const x of [20, 84]) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, 16, 8, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - 7, 12); c.lineTo(x - 6, 5); c.lineTo(x - 1, 9); c.fill(); c.beginPath(); c.moveTo(x + 7, 12); c.lineTo(x + 6, 5); c.lineTo(x + 1, 9); c.fill(); }
      text(c, name, 52, 17, 11, '#ffffff'); text(c, name, 116, 17, 11, '#ffffff');
    }), 18);
    lathe(g, 0, 0.036, 0, [[0.047, 0], [0.047, 0.004], [0.042, 0.005], [0.0, 0.004]], M(0xe8ecf0), 18);
    torus(g, 0.02, 0.042, 0, 0.012, 0.0025, M(0xb8c0cc), Math.PI / 2, 0, Math.PI * 2, 10);
  } },
  mouse: { name: 'ねずみのおもちゃ', tier: 1, yen: 400, w: 0.14, d: 0.07, h: 0.06, build(g) {
    const c = M(col(['#b8b0a8', '#e8e2d6', '#f2b0c0'])), p = M(0xf2a0b0);
    sph(g, 0.005, 0.028, 0, 0.032, c, 1.5, 0.85, 0.9);
    for (const s of [-1, 1]) { sph(g, -0.028, 0.05, s * 0.017, 0.013, c, 0.4, 1, 1); sph(g, -0.027, 0.05, s * 0.017, 0.009, p, 0.3, 1, 1); sph(g, -0.04, 0.035, s * 0.011, 0.0045, M(0x1a1a22)); }
    sph(g, -0.05, 0.025, 0, 0.007, p);
    const pts = [[0.05, 0.02, 0], [0.08, 0.012, 0.01], [0.105, 0.006, -0.006], [0.13, 0.004, 0.012]];
    for (let i = 0; i < 3; i++) rod(g, pts[i], pts[i + 1], 0.0035, p, 5);
  } },
  slipper: { name: 'スリッパ', tier: 1, yen: 1200, w: 0.26, d: 0.1, h: 0.05, build(g) {
    const c = M(col(PASTEL));
    rbox(g, 0, 0, 0, 0.25, 0.018, 0.095, 0.009, M(0xf7f3ea));
    const top = sph(g, -0.055, 0.016, 0, 0.065, c, 1, 0.42, 0.75); top.scale.y = 0.026;
    sph(g, -0.085, 0.04, 0, 0.012, M(0xffffff));
  } },
  zabuton: { name: 'ざぶとん', tier: 1, yen: 3000, w: 0.5, d: 0.5, h: 0.09, build(g) {
    const v = Math.floor(rnd() * 4), c = ['#c8564a', '#4a6a9a', '#6a9a6a', '#d8a050'][v];
    rbox(g, 0, 0, 0, 0.48, 0.075, 0.48, 0.035, texMat('zabu' + v, 64, 64, (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff22'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) x.fillRect(i * 8, j * 8, 8, 8); }));
    for (const [x, z] of [[-0.23, -0.23], [0.23, -0.23], [-0.23, 0.23], [0.23, 0.23], [0, 0]]) sph(g, x, 0.07, z, 0.014, M(0xf2e8d0), 1, 0.7, 1);
  } },
  laptop: { name: 'ノートパソコン', tier: 1, yen: 150000, w: 0.34, d: 0.24, h: 0.22, build(g) {
    const al = M(0xc8ced8);
    rbox(g, 0, 0, 0, 0.32, 0.014, 0.22, 0.006, al);
    box(g, 0, 0.014, 0.02, 0.28, 0.001, 0.1, texMat('keys', 128, 48, (c, w, h) => { c.fillStyle = '#b8c0cc'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2f3a'; for (let r = 0; r < 4; r++) for (let k = 0; k < 12; k++) c.fillRect(2 + k * 10.5, 2 + r * 11, 9, 9); }), false);
    box(g, 0, 0.014, 0.085, 0.09, 0.001, 0.045, M(0xb0b8c4), false);
    const lid = new THREE.Group(); lid.position.set(0, 0.014, -0.105); lid.rotation.x = -0.32; g.add(lid);
    rbox(lid, 0, 0, 0, 0.32, 0.2, 0.01, 0.005, al);
    plane(lid, 0, 0.1, 0.0052, 0.29, 0.17, screenMat('laptopScr', 128, 80, (c, w, h) => {
      c.fillStyle = '#3a6ab8'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(10, 10, 70, 46); c.fillStyle = '#5aa9f0'; c.fillRect(10, 10, 70, 8);
      c.fillStyle = '#cfd8e4'; for (let i = 0; i < 4; i++) c.fillRect(14, 24 + i * 7, 50 - i * 6, 3);
      c.fillStyle = '#f5d547'; c.fillRect(90, 14, 26, 20); c.fillStyle = '#e8574a'; c.fillRect(90, 40, 26, 20); c.fillStyle = '#1a2140'; c.fillRect(0, h - 8, w, 8);
    }));
  } },
  desklamp: { name: 'デスクライト', tier: 1, yen: 4000, w: 0.16, d: 0.16, h: 0.34, build(g) {
    const c = M(col(['#f2f2f2', '#2a2f3a', '#e8574a', '#f5d547'])), j = M(0x888f9a);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.065, 0], [0.065, 0.012], [0.03, 0.022], [0.0, 0.024]], c, 18);
    rod(g, [0, 0.02, 0], [0.03, 0.2, 0], 0.007, c); sph(g, 0.03, 0.2, 0, 0.012, j);
    rod(g, [0.03, 0.2, 0], [0.11, 0.27, 0], 0.007, c); sph(g, 0.11, 0.27, 0, 0.012, j);
    const sh = lathe(g, 0.12, 0.2, 0, [[0.055, 0], [0.04, 0.03], [0.02, 0.06], [0.0, 0.065]], c, 16); sh.rotation.z = 0.35;
    sph(g, 0.115, 0.215, 0, 0.022, M(0xfff6d0, 1.0));
  } },
  pens: { name: 'ペン立て', tier: 1, yen: 900, w: 0.08, d: 0.08, h: 0.17, build(g) {
    lathe(g, 0, 0, 0, [[0.0, 0], [0.034, 0], [0.036, 0.09], [0.032, 0.09], [0.03, 0.01], [0.0, 0.01]], M(col(['#3a3f48', '#c8ced8', '#c8945a'])), 14);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * 6.28, x0 = Math.cos(a) * 0.012, z0 = Math.sin(a) * 0.012, x1 = x0 * 2.6, z1 = z0 * 2.6, c = M(col(BRIGHT)), top = 0.15 + rr(0, 0.025);
      rod(g, [x0, 0.02, z0], [x1, top, z1], 0.0045, c, 6); sph(g, x1, top, z1, 0.005, i % 2 ? M(0x3a3f48) : c);
    }
  } },
  game: { name: 'ゲーム機', tier: 1, yen: 33000, w: 0.24, d: 0.1, h: 0.03, build(g) {
    rbox(g, 0, 0, 0, 0.14, 0.016, 0.08, 0.004, M(0x2a2f3a));
    plane(g, 0, 0.0165, 0, 0.12, 0.068, screenMat('gameScr', 96, 54, (c, w, h) => {
      c.fillStyle = '#8ad0f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#6ac04a'; c.fillRect(0, h - 12, w, 12);
      c.fillStyle = '#c8945a'; c.fillRect(30, h - 22, 10, 10); c.fillRect(56, h - 30, 10, 18); c.fillStyle = '#e8343e'; c.fillRect(16, h - 20, 7, 8); c.fillStyle = '#f5d547'; c.beginPath(); c.arc(75, 12, 6, 0, 7); c.fill();
    }), 0, -Math.PI / 2);
    for (const [s, c] of [[-1, 0x4aa3e0], [1, 0xe8343e]]) {
      rbox(g, s * 0.092, 0, 0, 0.045, 0.02, 0.08, 0.012, M(c));
      cyl(g, s * 0.092, 0.02, s * -0.015, 0.008, 0.008, 0.008, M(0x2a2f3a), 10, false);
      for (const [dx, dz] of [[0, 0.012], [0.008, 0.02], [-0.008, 0.02], [0, 0.028]]) cyl(g, s * 0.092 + dx, 0.02, s * 0.0 + dz * s, 0.0035, 0.0035, 0.004, M(0x2a2f3a), 8, false);
    }
  } },
  smallbin: { name: 'くずかご', tier: 1, yen: 1000, w: 0.24, d: 0.24, h: 0.3, build(g) {
    lathe(g, 0, 0, 0, [[0.0, 0], [0.095, 0], [0.12, 0.27], [0.125, 0.28], [0.115, 0.28], [0.09, 0.012], [0.0, 0.012]], M(col(['#f7f3ea', '#4aa3e0', '#5cbf6a', '#e8b8c8'])), 18);
    for (let i = 0; i < 4; i++) ico(g, rr(-0.05, 0.05), 0.24 + rr(0, 0.05), rr(-0.05, 0.05), 0.035, M(0xf7f3ea), 0);
  } },
  ricecooker: { name: '炊飯器', tier: 1, yen: 25000, w: 0.3, d: 0.3, h: 0.25, build(g) {
    const w = M(0xf2f4f6);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.13, 0], [0.142, 0.02], [0.142, 0.17], [0.0, 0.17]], w, 24);
    lathe(g, 0, 0.17, 0, [[0.144, 0], [0.14, 0.03], [0.1, 0.06], [0.0, 0.065]], M(0xe0e4e8), 24);
    box(g, 0, 0.06, 0.13, 0.11, 0.07, 0.03, M(0x3a3f48), false);
    box(g, 0, 0.08, 0.146, 0.05, 0.02, 0.001, screenMat('rcScr', 32, 16, (c) => { c.fillStyle = '#8ad8a0'; c.fillRect(0, 0, 32, 16); text(c, '12:00', 16, 8, 9, '#1a3a2a'); }), false);
    for (const x of [-0.035, 0.035]) cyl(g, x, 0.05, 0.146, 0.008, 0.008, 0.004, M(x < 0 ? 0xf2a93b : 0x5aa9f0), 10, false).rotation.x = Math.PI / 2;
    rbox(g, 0, 0.22, 0.09, 0.07, 0.03, 0.04, 0.01, M(0x9aa0aa));
  } },
  extinguisher: { name: '消火器', tier: 1, yen: 6000, w: 0.18, d: 0.18, h: 0.36, build(g) {
    const r = M(0xe8343e);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.065, 0], [0.07, 0.01], [0.07, 0.25], [0.06, 0.28], [0.03, 0.29], [0.0, 0.29]], r, 18);
    tube(g, 0, 0.1, 0, 0.0705, 0.0705, 0.09, texMat('fireLabel', 128, 48, (c, w, h) => { c.fillStyle = '#e8343e'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(20, 4, 40, h - 8); text(c, '消火器', 40, h / 2, 12, '#e8343e'); }), 18);
    cyl(g, 0, 0.29, 0, 0.018, 0.022, 0.03, M(0x3a3f48), 10, false);
    box(g, 0.02, 0.31, 0, 0.07, 0.01, 0.02, M(0x2a2f3a), false); box(g, -0.01, 0.325, 0, 0.06, 0.01, 0.02, M(0x2a2f3a), false);
    for (const [a, b] of [[[0.0, 0.31, 0.015], [0.05, 0.25, 0.06]], [[0.05, 0.25, 0.06], [0.07, 0.12, 0.07]], [[0.07, 0.12, 0.07], [0.075, 0.05, 0.072]]]) rod(g, a, b, 0.007, M(0x2a2f3a), 6);
    cyl(g, 0.075, 0.025, 0.072, 0.012, 0.009, 0.03, M(0x2a2f3a), 8, false);
  } },
  suitcase: { name: 'スーツケース', tier: 1, yen: 22000, w: 0.36, d: 0.2, h: 0.4, build(g) {
    const c = M(col(['#e8574a', '#4aa3e0', '#3b3f4a', '#f2c030', '#c890f0']));
    rbox(g, 0, 0.025, 0, 0.32, 0.3, 0.18, 0.03, c);
    for (const x of [-0.08, 0, 0.08]) box(g, x, 0.04, 0.092, 0.025, 0.27, 0.006, c, false);
    box(g, 0, 0.17, 0.0, 0.325, 0.012, 0.185, M(0x3a3f48), false);
    for (const x of [-0.13, 0.13]) for (const z of [-0.06, 0.06]) { cyl(g, x, 0.0, z, 0.016, 0.016, 0.022, M(0x2a2f3a), 10, false).rotation.x = Math.PI / 2; }
    for (const x of [-0.07, 0.07]) rod(g, [x, 0.32, -0.06], [x, 0.4, -0.06], 0.007, M(0xb8c0cc), 6);
    rbox(g, 0, 0.39, -0.06, 0.17, 0.02, 0.025, 0.008, M(0x2a2f3a));
  } },
  umbrella: { name: 'かさ', tier: 1, yen: 1500, w: 0.1, d: 0.1, h: 0.34, build(g) {
    const c = M(col(BRIGHT.concat(['#3b3f4a'])));
    rod(g, [0, 0, 0], [0, 0.3, 0], 0.004, M(0x3a3f48), 6);
    lathe(g, 0, 0.04, 0, [[0.006, 0], [0.03, 0.08], [0.036, 0.18], [0.02, 0.24], [0.006, 0.26]], c, 8);
    torus(g, 0.018, 0.31, 0, 0.018, 0.005, M(0x6a4a32), 0, 0, Math.PI, 10);
  } },

  // ───────── tier 2 ─────────
  lowtable: { name: 'ちゃぶ台', tier: 2, yen: 18000, w: 0.9, d: 0.9, h: 0.38, top: 0.38, build(g) {
    const top = texMat('chabudai', 128, 128, (c, w, h) => { c.fillStyle = '#b07a42'; c.beginPath(); c.arc(64, 64, 64, 0, 7); c.fill(); c.strokeStyle = '#9a6634'; c.lineWidth = 2; for (let r = 8; r < 64; r += 7) { c.beginPath(); c.ellipse(60, 66, r * 1.1, r, 0.3, 0, 7); c.stroke(); } });
    lathe(g, 0, 0.32, 0, [[0.0, 0], [0.43, 0], [0.45, 0.012], [0.45, 0.04], [0.43, 0.055], [0.0, 0.055]], M(0x9a6634), 32);
    disc(g, 0, 0.376, 0, 0.44, top, 32);
    for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) lathe(g, x, 0, z, [[0.0, 0], [0.025, 0], [0.032, 0.25], [0.028, 0.32], [0.0, 0.32]], M(0x8a5a2e), 8);
    box(g, 0, 0.27, -0.25, 0.5, 0.04, 0.03, M(0x8a5a2e)); box(g, 0, 0.27, 0.25, 0.5, 0.04, 0.03, M(0x8a5a2e));
  } },
  tvstand: { name: 'テレビ台', tier: 2, yen: 20000, w: 1.3, d: 0.42, h: 0.42, top: 0.42, build(g) {
    const w = M(0x6a4a32), dk = M(0x4a3222);
    rbox(g, 0, 0.04, 0, 1.3, 0.38, 0.42, 0.015, w);
    for (const x of [-0.55, 0.55]) cyl(g, x, 0, 0.12, 0.02, 0.015, 0.04, dk, 8, false);
    for (const x of [-0.55, 0.55]) cyl(g, x, 0, -0.12, 0.02, 0.015, 0.04, dk, 8, false);
    for (const x of [-0.42, 0.42]) { rbox(g, x, 0.08, 0.205, 0.4, 0.3, 0.02, 0.008, M(0x7a5a3e)); rbox(g, x, 0.2, 0.22, 0.1, 0.02, 0.02, 0.008, M(0xd8b860)); }
    box(g, 0, 0.08, 0.17, 0.4, 0.3, 0.06, dk, false);
    rbox(g, 0, 0.1, 0.12, 0.3, 0.05, 0.18, 0.01, M(0x2a2f3a)); box(g, 0.1, 0.13, 0.211, 0.03, 0.005, 0.002, M(0x5aff9a, 1), false);
  } },
  colorbox: { name: 'カラーボックス', tier: 2, yen: 3000, w: 0.44, d: 0.3, h: 0.9, top: [0.02, 0.32, 0.62, 0.9], build(g) {
    const c = M(col(['#f7f3ea', '#c89a6a', '#e8b8c8', '#a8c8e8']));
    box(g, 0, 0, -0.135, 0.44, 0.9, 0.03, c);
    for (const x of [-0.205, 0.205]) rbox(g, x, 0, 0, 0.03, 0.9, 0.3, 0.006, c);
    for (const y of [0, 0.3, 0.6, 0.87]) rbox(g, 0, y, 0, 0.4, 0.03, 0.3, 0.006, c);
    if (rnd() < 0.6) { rbox(g, 0, 0.035, 0.0, 0.36, 0.24, 0.26, 0.02, M(col(PASTEL))); rbox(g, 0, 0.2, 0.13, 0.1, 0.03, 0.02, 0.01, M(0xffffff)); }
  } },
  minifridge: { name: '小さい冷蔵庫', tier: 2, yen: 30000, w: 0.5, d: 0.5, h: 0.85, top: 0.85, build(g) {
    const c = M(col(['#f2f4f6', '#e8574a', '#3b3f4a', '#a8d8c8']));
    rbox(g, 0, 0.02, 0, 0.48, 0.82, 0.48, 0.035, c);
    box(g, 0, 0.6, 0.241, 0.46, 0.008, 0.003, M(0x888f9a), false);
    rbox(g, 0.18, 0.35, 0.25, 0.025, 0.2, 0.025, 0.01, M(0x9aa0aa)); rbox(g, 0.18, 0.66, 0.25, 0.025, 0.1, 0.025, 0.01, M(0x9aa0aa));
    for (const [x, cc] of [[-0.12, '#f5d547'], [-0.05, '#5cbf6a'], [0.0, '#e86fa8']]) box(g, x, 0.7, 0.242, 0.05, 0.05, 0.004, M(hex(cc)), false);
    plane(g, -0.06, 0.4, 0.242, 0.2, 0.26, texMat('memo', 64, 80, (x) => { x.fillStyle = '#fffbe0'; x.fillRect(0, 0, 64, 80); x.strokeStyle = '#c8b880'; for (let i = 1; i < 7; i++) { x.beginPath(); x.moveTo(6, i * 11); x.lineTo(58, i * 11); x.stroke(); } text(x, 'ごはん', 32, 14, 10, '#e8574a'); x.fillStyle = '#e8343e'; x.beginPath(); x.arc(32, 4, 4, 0, 7); x.fill(); }));
    for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) cyl(g, x, 0, z, 0.02, 0.02, 0.02, M(0x2a2f3a), 8, false);
  } },
  desk: { name: 'つくえ', tier: 2, yen: 24000, w: 1.2, d: 0.6, h: 0.72, top: 0.72, build(g) {
    const top = texMat('deskTop', 128, 64, (c, w, h) => { c.fillStyle = '#c89a6a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b8885a'; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(0, i * 7 + 3); c.bezierCurveTo(40, i * 7, 80, i * 7 + 6, 128, i * 7 + 3); c.stroke(); } }), w = M(0xb88a5a);
    rbox(g, 0, 0.68, 0, 1.2, 0.04, 0.6, 0.01, top);
    rbox(g, -0.56, 0, 0, 0.04, 0.68, 0.56, 0.01, w);
    rbox(g, 0.4, 0, 0, 0.38, 0.68, 0.56, 0.015, w);
    box(g, -0.1, 0.3, -0.27, 0.9, 0.38, 0.02, w);
    for (const y of [0.05, 0.27, 0.48]) { rbox(g, 0.4, y, 0.285, 0.34, 0.18, 0.02, 0.008, M(0xa8784a)); rbox(g, 0.4, y + 0.11, 0.3, 0.1, 0.02, 0.02, 0.008, M(0xd8b860)); }
  } },
  fan: { name: '扇風機', tier: 2, yen: 8000, w: 0.4, d: 0.4, h: 0.95, build(g) {
    const c = M(0xf2f4f6), blue = M(col(['#4aa3e0', '#5cbf6a', '#f28aa0']));
    lathe(g, 0, 0, 0, [[0.0, 0], [0.18, 0], [0.18, 0.03], [0.12, 0.06], [0.0, 0.065]], c, 20);
    for (let i = 0; i < 3; i++) cyl(g, -0.06 + i * 0.06, 0.055, 0.1, 0.018, 0.018, 0.012, M(i === 0 ? 0x5aa9f0 : 0xd8dde4), 10, false);
    cyl(g, 0, 0.06, 0, 0.022, 0.022, 0.6, c, 10);
    const head = new THREE.Group(); head.position.set(0, 0.74, 0); head.rotation.x = -0.1; g.add(head);
    lathe(head, 0, 0, -0.1, [[0.0, 0], [0.06, 0], [0.07, 0.1], [0.0, 0.11]], c, 14).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const b = sph(head, 0, 0, 0.02, 0.08, blue, 1.1, 0.5, 0.06); b.rotation.z = i * 2.09; b.position.set(Math.cos(i * 2.09 + 1.57) * 0.07, Math.sin(i * 2.09 + 1.57) * 0.07, 0.02); }
    const guard = texMat('fanGuard', 64, 64, (x) => { x.strokeStyle = '#d8dde4'; x.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; x.beginPath(); x.moveTo(32, 32); x.lineTo(32 + Math.cos(a) * 31, 32 + Math.sin(a) * 31); x.stroke(); } for (const r of [12, 22, 31]) { x.beginPath(); x.arc(32, 32, r, 0, 7); x.stroke(); } x.fillStyle = '#4aa3e0'; x.beginPath(); x.arc(32, 32, 6, 0, 7); x.fill(); }, { alphaTest: 0.5, side: THREE.DoubleSide });
    for (const z of [-0.02, 0.06]) { const gd = disc(head, 0, 0, z, 0.2, guard, 24); gd.rotation.x = Math.PI / 2; }
    torus(head, 0, 0, 0.02, 0.2, 0.008, c, 0, 0, Math.PI * 2, 24);
  } },
  cardboard: { name: '段ボール', tier: 2, yen: 100, w: 0.55, d: 0.42, h: 0.42, top: 0.42, build(g) {
    const v = Math.floor(rnd() * 3), side = texMat('cardSide' + v, 128, 96, (c, w, h) => {
      c.fillStyle = '#c8945a'; c.fillRect(0, 0, w, h); c.fillStyle = '#b8844a'; for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 1, h);
      c.fillStyle = '#5a3a24'; text(c, ['ねこ運輸', 'みかん', 'FRAGILE'][v], w / 2, h / 2, 16, '#5a3a24');
      c.strokeStyle = '#5a3a24'; c.lineWidth = 2; c.strokeRect(w / 2 - 40, h / 2 - 14, 80, 28);
      if (v === 0) { c.beginPath(); c.arc(20, 20, 8, 0, 7); c.stroke(); }
    });
    box(g, 0, 0, 0, 0.54, 0.42, 0.42, side);
    box(g, 0, 0.42, 0, 0.545, 0.004, 0.08, M(0xd8c8a0), false);
    box(g, 0, 0.21, 0.211, 0.545, 0.06, 0.004, M(0xd8c8a0), false);
  } },
  bed: { name: 'ねこベッド', tier: 2, yen: 5000, w: 0.6, d: 0.6, h: 0.24, build(g) {
    const c = M(col(['#f2b0c0', '#bfe0f5', '#d8a050', '#c8a8e8']));
    torus(g, 0, 0.11, 0, 0.22, 0.085, c, -Math.PI / 2, 0, Math.PI * 2, 24);
    cyl(g, 0, 0, 0, 0.28, 0.28, 0.06, c, 24, false);
    lathe(g, 0, 0.06, 0, [[0.0, 0], [0.2, 0], [0.22, 0.04], [0.0, 0.05]], M(0xfff8ee), 24);
    sph(g, 0.08, 0.12, -0.05, 0.05, M(0xf2f2f2), 1, 0.8, 1);
  } },
  stroller: { name: 'ベビーカー', tier: 2, yen: 50000, w: 0.6, d: 0.9, h: 1.05, build(g) {
    const c = M(col(['#4a6a9a', '#c8564a', '#3b3f4a', '#6a9a6a'])), metal = M(0x9aa0aa), k = M(0x2a2f3a);
    rbox(g, 0, 0.32, 0.02, 0.48, 0.3, 0.56, 0.08, c);
    lathe(g, 0, 0.42, -0.2, [[0.0, 0], [0.26, 0], [0.24, 0.2], [0.14, 0.32], [0.0, 0.34]], c, 16).rotation.x = 0.6;
    disc(g, 0, 0.6, 0.05, 0.18, M(0xf7f0e0), 16);
    for (const s of [-1, 1]) {
      rod(g, [s * 0.22, 0.09, -0.3], [s * 0.22, 0.4, 0.0], 0.012, metal, 6); rod(g, [s * 0.22, 0.09, 0.32], [s * 0.22, 0.4, 0.0], 0.012, metal, 6);
      rod(g, [s * 0.22, 0.4, 0.0], [s * 0.22, 1.0, 0.45], 0.014, metal, 6);
      for (const z of [-0.3, 0.32]) { const w = torus(g, s * 0.24, 0.09, z, 0.075, 0.02, k, 0, Math.PI / 2, Math.PI * 2, 14); cyl(g, s * 0.24 - 0.01, 0.09, z, 0.02, 0.02, 0.02, metal, 8, false).rotation.z = Math.PI / 2; }
    }
    rod(g, [-0.24, 1.0, 0.45], [0.24, 1.0, 0.45], 0.022, k, 10);
    rbox(g, 0, 0.14, 0.02, 0.4, 0.06, 0.4, 0.02, k);
  } },
  umbrellastand: { name: '傘立て', tier: 2, yen: 6000, w: 0.5, d: 0.3, h: 0.95, build(g) {
    const st = M(0x9aa0aa);
    rbox(g, 0, 0, 0, 0.48, 0.06, 0.28, 0.01, st);
    for (const y of [0.25, 0.5]) { box(g, 0, y, 0.13, 0.48, 0.02, 0.02, st); box(g, 0, y, -0.13, 0.48, 0.02, 0.02, st); for (let i = 0; i < 4; i++) box(g, -0.18 + i * 0.12, y, 0, 0.012, 0.02, 0.26, st); }
    for (const [x, z] of [[-0.23, -0.13], [0.23, -0.13], [-0.23, 0.13], [0.23, 0.13]]) rod(g, [x, 0.03, z], [x, 0.5, z], 0.01, st, 6);
    for (let i = 0; i < 4; i++) {
      const x = -0.18 + i * 0.12, c = M(col(BRIGHT.concat(['#3b3f4a']))), tilt = rr(-0.08, 0.08);
      const u = new THREE.Group(); u.position.set(x, 0.04, 0); u.rotation.z = tilt; g.add(u);
      rod(u, [0, 0, 0], [0, 0.82, 0], 0.005, M(0x3a3f48), 6);
      lathe(u, 0, 0.08, 0, [[0.006, 0], [0.032, 0.12], [0.038, 0.38], [0.02, 0.6], [0.006, 0.66]], c, 8);
      torus(u, 0.02, 0.82, 0, 0.02, 0.006, M(0x6a4a32), 0, 0, Math.PI, 10);
    }
  } },
  massage: { name: 'マッサージチェア', tier: 2, yen: 400000, w: 0.9, d: 1.2, h: 1.25, build(g) {
    const c = M(col(['#3b3f4a', '#8a3a3a', '#c8a07a', '#f2f2f2'])), acc = M(0x9aa0aa);
    rbox(g, 0, 0, 0.05, 0.84, 0.42, 0.8, 0.08, M(0x2a2f3a));
    rbox(g, 0, 0.36, 0.08, 0.66, 0.16, 0.66, 0.07, c);
    const back = rbox(g, 0, 0.45, -0.3, 0.7, 0.85, 0.22, 0.1, c); back.rotation.x = -0.18;
    rbox(g, 0, 1.12, -0.38, 0.42, 0.2, 0.16, 0.07, c);
    for (const s of [-1, 1]) { rbox(g, s * 0.4, 0.38, 0.05, 0.16, 0.38, 0.84, 0.07, c); rbox(g, s * 0.4, 0.74, 0.25, 0.16, 0.04, 0.3, 0.02, acc); }
    const leg = rbox(g, 0, 0.05, 0.55, 0.5, 0.36, 0.22, 0.07, c); leg.rotation.x = 0.35;
    rbox(g, 0.4, 0.78, 0.38, 0.1, 0.06, 0.14, 0.02, M(0x1a1a22));
  } },
  mailbox: { name: 'ポスト', tier: 2, yen: 200000, w: 0.5, d: 0.5, h: 1.35, build(g) {
    const r = M(0xd8343e), k = M(0x2a2f3a);
    lathe(g, 0, 0, 0, [[0.0, 0], [0.16, 0], [0.16, 0.04], [0.11, 0.06], [0.11, 0.4], [0.0, 0.4]], k, 16);
    cyl(g, 0, 0.4, 0, 0.22, 0.22, 0.72, r, 24);
    lathe(g, 0, 1.12, 0, [[0.235, 0], [0.235, 0.04], [0.2, 0.12], [0.1, 0.2], [0.0, 0.22]], r, 24);
    box(g, 0, 0.92, 0.205, 0.26, 0.05, 0.04, k, false);
    plane(g, 0, 0.72, 0.221, 0.18, 0.2, texMat('postMark', 64, 72, (c) => { c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(0, 0, 64, 72, 6); c.fill(); text(c, '〒', 32, 26, 30, '#d8343e'); text(c, '郵便', 32, 56, 14, '#d8343e'); }));
    box(g, 0, 0.5, 0.218, 0.2, 0.12, 0.01, M(0xb82a32), false);
  } },
  bicycle: { name: '自転車', tier: 2, yen: 30000, w: 0.4, d: 1.7, h: 1.05, build(g) {
    const c = M(col(['#e8343e', '#4aa3e0', '#f2f2f2', '#5cbf6a', '#f2c030'])), k = M(0x2a2f3a), st = M(0xb8c0cc);
    for (const z of [-0.55, 0.55]) { torus(g, 0, 0.34, z, 0.31, 0.025, k, 0, Math.PI / 2, Math.PI * 2, 24); torus(g, 0, 0.34, z, 0.28, 0.008, st, 0, Math.PI / 2, Math.PI * 2, 20); cyl(g, -0.03, 0.34, z, 0.04, 0.04, 0.06, st, 10, false).rotation.z = Math.PI / 2; for (let i = 0; i < 6; i++) { const a = i / 6 * 3.14; rod(g, [0, 0.34 + Math.sin(a) * 0.28, z + Math.cos(a) * 0.28], [0, 0.34 - Math.sin(a) * 0.28, z - Math.cos(a) * 0.28], 0.003, st, 4); } }
    const pts = { rear: [0, 0.34, -0.55], crank: [0, 0.3, -0.05], seat: [0, 0.76, -0.2], head: [0, 0.78, 0.38], front: [0, 0.34, 0.55] };
    for (const [a, b] of [['rear', 'crank'], ['crank', 'seat'], ['seat', 'rear'], ['crank', 'head'], ['seat', 'head'], ['head', 'front']]) rod(g, pts[a], pts[b], 0.022, c, 8);
    rod(g, [0, 0.76, -0.2], [0, 0.86, -0.24], 0.016, st, 6); rbox(g, 0, 0.86, -0.25, 0.12, 0.05, 0.24, 0.02, k);
    rod(g, [0, 0.78, 0.38], [0, 0.95, 0.4], 0.018, st, 6); rod(g, [-0.24, 0.95, 0.4], [0.24, 0.95, 0.4], 0.016, st, 6);
    for (const s of [-1, 1]) cyl(g, s * 0.22, 0.95, 0.4, 0.022, 0.022, 0.08, k, 8, false).rotation.z = Math.PI / 2;
    const bk = texMat('bikeBasket', 32, 32, (x) => { x.strokeStyle = '#c8d0dc'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 8, 0); x.lineTo(i * 8, 32); x.stroke(); x.beginPath(); x.moveTo(0, i * 8); x.lineTo(32, i * 8); x.stroke(); } }, { alphaTest: 0.5, side: THREE.DoubleSide });
    box(g, 0, 0.72, 0.62, 0.32, 0.22, 0.26, bk, false);
    torus(g, 0, 0.3, -0.05, 0.08, 0.012, st, 0, Math.PI / 2, Math.PI * 2, 14);
    torus(g, 0, 0.5, -0.55, 0.3, 0.012, c, 0, Math.PI / 2, Math.PI * 0.55, 12);
  } },

  // ───────── tier 3 ─────────
  cattower: { name: 'キャットタワー', tier: 3, yen: 25000, w: 0.7, d: 0.7, h: 1.85, top: [0.5, 1.1, 1.75], build(g) {
    const sisal = texMat('sisal', 32, 64, (c) => { c.fillStyle = '#d8c8a0'; c.fillRect(0, 0, 32, 64); c.fillStyle = '#c0ae84'; for (let y = 0; y < 64; y += 3) c.fillRect(0, y, 32, 1); });
    const pad = M(col(['#c8a07a', '#f2b0c0', '#a8c8e8', '#f7f0e0']));
    rbox(g, 0, 0, 0, 0.7, 0.06, 0.7, 0.025, pad);
    tube(g, -0.15, 0.06, -0.15, 0.06, 0.06, 1.65, sisal, 12); tube(g, 0.18, 0.06, 0.15, 0.06, 0.06, 1.0, sisal, 12);
    rbox(g, 0.1, 0.44, 0.1, 0.5, 0.06, 0.5, 0.025, pad); rbox(g, -0.1, 1.04, -0.1, 0.5, 0.06, 0.5, 0.025, pad);
    lathe(g, -0.15, 1.69, -0.15, [[0.0, 0], [0.24, 0], [0.26, 0.05], [0.22, 0.1], [0.18, 0.06], [0.0, 0.06]], pad, 20);
    rbox(g, 0.12, 0.06, -0.15, 0.4, 0.34, 0.36, 0.05, pad);
    box(g, 0.12, 0.12, 0.031, 0.18, 0.18, 0.002, M(0x3a2a22), false);
    rod(g, [0.3, 0.44, 0.3], [0.3, 0.3, 0.3], 0.004, M(0xffffff), 4); sph(g, 0.3, 0.28, 0.3, 0.025, M(0xe86fa8));
  } },
  roomwall: { name: '部屋のかべ', tier: 3, yen: 150000, w: 1.5, d: 0.14, h: 2.6, build(g, o) {
    const w = o.w || 1.5;
    const paper = texMat('wallpaper', 64, 64, (c) => { c.fillStyle = '#f7efe2'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#ecdcc8'; for (let y = 0; y < 64; y += 16) for (let x = (y / 16) % 2 * 8; x < 64; x += 16) { c.beginPath(); c.arc(x + 4, y + 8, 2.5, 0, 7); c.fill(); } });
    box(g, 0, 0, 0, w, 2.6, 0.14, paper);
    for (const z of [-0.072, 0.072]) { box(g, 0, 0, z, w, 0.1, 0.012, M(0xa8743e), false); box(g, 0, 2.5, z, w, 0.06, 0.012, M(0xf2e8d8), false); }
    if (o.poster) plane(g, 0, 1.45, 0.075, 0.5, 0.7, basic(0xffffff, { map: o.poster }));
  } },
  door: { name: 'ドア', tier: 3, yen: 80000, w: 1.0, d: 0.14, h: 2.6, build(g) {
    box(g, 0, 0, 0, 1.0, 2.6, 0.14, M(0xf7efe2));
    box(g, 0, 0, 0, 0.92, 2.12, 0.16, M(0xf2e8d8));
    box(g, 0, 0, 0, 0.82, 2.06, 0.18, texMat('doorWood', 64, 128, (c, w, h) => { c.fillStyle = '#a8743e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8a5a2e'; c.lineWidth = 3; c.strokeRect(8, 8, w - 16, 50); c.strokeRect(8, 66, w - 16, 54); for (let i = 0; i < 10; i++) { c.strokeStyle = '#9a6634'; c.lineWidth = 1; c.beginPath(); c.moveTo(i * 7, 0); c.lineTo(i * 7 + 2, h); c.stroke(); } }));
    for (const z of [-0.1, 0.1]) { sph(g, 0.3, 1.0, z, 0.035, M(0xd8b860)); box(g, 0.3, 0.95, z * 0.95, 0.03, 0.14, 0.01, M(0xd8b860), false); }
    plane(g, 0, 1.75, 0.091, 0.36, 0.14, texMat('doorSign', 96, 36, (c) => { c.fillStyle = '#f7f0e0'; c.beginPath(); c.roundRect(0, 0, 96, 36, 8); c.fill(); text(c, 'ねこのへや', 48, 18, 14, '#8a5a2e'); }));
  } },
  mapboard: { name: '案内板', tier: 3, yen: 600000, w: 1.4, d: 0.5, h: 2.2, build(g) {
    const m = M(0x2a3a4a);
    rbox(g, 0, 0, 0, 1.0, 0.1, 0.5, 0.03, m); rbox(g, 0, 0.1, 0, 1.3, 2.0, 0.2, 0.04, m);
    plane(g, 0, 1.15, 0.101, 1.15, 1.7, screenMat('floormap', 160, 236, (c, w, h) => {
      c.fillStyle = '#f2f6fa'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a4a7a'; c.fillRect(0, 0, w, 28); text(c, 'フロアマップ 1F', w / 2, 14, 13, '#ffffff');
      const shops = [['#c89a6a', 'CAFE'], ['#e8b8c8', 'NYA'], ['#a8c8e8', '家電'], ['#f2d27a', 'ペット'], ['#d8e8d0', 'スーパー'], ['#e8574a', 'フード']];
      shops.forEach(([cc, n], i) => { c.fillStyle = cc; c.fillRect(10 + (i % 2) * 72, 40 + Math.floor(i / 2) * 50, 66, 42); text(c, n, 43 + (i % 2) * 72, 61 + Math.floor(i / 2) * 50, 12, '#333'); });
      c.fillStyle = '#e8343e'; c.beginPath(); c.arc(80, 200, 8, 0, 7); c.fill(); text(c, '現在地', 80, 222, 11, '#e8343e');
    }));
    plane(g, 0, 2.0, -0.101, 1.15, 0.2, texMat('mapback', 128, 24, (c) => { c.fillStyle = '#2a3a4a'; c.fillRect(0, 0, 128, 24); text(c, 'NEKO PUNCH MALL', 64, 12, 11, '#f2c94c'); }), Math.PI);
  } },
  photobooth: { name: 'プリ機', tier: 3, yen: 2000000, w: 1.8, d: 1.4, h: 2.4, build(g) {
    const v = Math.floor(rnd() * 3), base = ['#f28aa0', '#c890f0', '#6ad8c8'][v], c = M(hex(base));
    rbox(g, 0, 0, 0, 1.8, 2.3, 1.4, 0.06, c);
    plane(g, -0.42, 1.25, 0.701, 0.82, 1.6, screenMat('puriF' + v, 96, 192, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, base); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      text(x, 'Puri', w / 2, 30, 30, '#e86fa8'); text(x, 'NYAN', w / 2, 62, 20, '#8a6ad8');
      x.fillStyle = '#f2d8c8'; x.beginPath(); x.arc(w / 2, 120, 24, 0, 7); x.fill(); x.fillStyle = '#3a2a22'; x.beginPath(); x.arc(w / 2, 110, 26, Math.PI, 0); x.fill();
      for (let i = 0; i < 8; i++) { x.fillStyle = pick(['#f5d547', '#ffffff', '#e86fa8']); x.beginPath(); x.arc(rr(6, w - 6), rr(80, h - 10), 4, 0, 7); x.fill(); }
    }));
    const curtain = texMat('curtain' + v, 64, 64, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : base; x.fillRect(i * 8, 0, 8, 64); } });
    box(g, 0.45, 0.25, 0.705, 0.82, 1.85, 0.02, curtain, false);
    rbox(g, 0, 2.3, 0, 1.9, 0.12, 1.5, 0.04, M(0xfff0f8, 1));
    for (let i = 0; i < 6; i++) sph(g, -0.8 + i * 0.32, 2.42, 0.72, 0.05, M(col(['#f5d547', '#ffffff', '#e86fa8']), 1));
  } },
};
