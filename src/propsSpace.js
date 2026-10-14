// 宇宙（Lv.10〜）の物：人工衛星・宇宙ステーション・ロケット・UFO・小惑星 → 月・地球・惑星 → 木星・土星・太陽
// 大きさは本物ではなく「その時のねこの半分くらい」（ねこ Lv.10 ≒ 1.7km、Lv.11 ≒ 4km、Lv.12 ≒ 10km）
import * as THREE from 'three';
import { box, cyl, sph, rod, plane, cg } from './core/geometry.js';
import { toon } from './core/materials.js';
import { canvasTex } from './core/textures.js';
import { rnd, pick, rr } from './core/random.js';
import { M, col, glow } from './props.js';
import { rbox, lathe, ico, tube, disc, torus, texMat, text } from './core/shapes.js';

// 惑星の球（細かめの球。y は下端）
function ball(p, x, y, z, r, m) {
  const geo = cg('planet', () => new THREE.SphereGeometry(1, 48, 32));
  const me = new THREE.Mesh(geo, m); me.position.set(x, y + r, z); me.scale.setScalar(r); me.userData.outline = false; p.add(me); return me;
}
// でこぼこの岩（同じ位置の頂点は同じだけ動かすので、すき間ができない）
function lumpy(detail, seed) {
  const geo = new THREE.IcosahedronGeometry(1, detail), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 0.82 + 0.16 * Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.7 - seed) + 0.1 * Math.sin(v.z * 5.3 + v.x * 2 + seed * 2);
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  geo.computeVertexNormals(); return geo;
}
// 正距円筒の絵（横 = 経度、たて = 緯度）
const planetTex = (key, draw) => texMat(key, 512, 256, draw);
const craters = (c, w, h, n, base, dark, light) => {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = h * 0.1 + Math.random() * h * 0.8, r = 3 + Math.random() ** 2 * 26;
    c.fillStyle = dark; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill();
    c.fillStyle = base; c.beginPath(); c.ellipse(x + r * 0.15, y + r * 0.12, r * 0.78, r * 0.62, 0, 0, 7); c.fill();
    c.strokeStyle = light; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 3.4, 5.6); c.stroke();
  }
};
const bands = (c, w, h, colors, wobble = 6) => {
  let y = 0;
  while (y < h) {
    const bh = 6 + Math.random() * 22; c.fillStyle = pick(colors);
    c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x * 0.03 + y) * wobble * Math.random());
    c.lineTo(w, y + bh); c.lineTo(0, y + bh); c.fill(); y += bh;
  }
};
const blobs = (c, w, h, n, colors, rmin, rmax) => {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = h * 0.15 + Math.random() * h * 0.7; c.fillStyle = pick(colors);
    for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(x + rr(-rmax, rmax), y + rr(-rmax * 0.5, rmax * 0.5), rr(rmin, rmax), rr(rmin, rmax) * 0.6, rr(0, 3), 0, 7); c.fill(); }
  }
};

export const SPACE_PROPS = {
  // ───────── tier 10 ─────────
  satellite: { name: '人工衛星', tier: 10, yen: 30000000000, w: 420, d: 120, h: 260, solid: false, build(g) {
    const foil = texMat('foil', 64, 64, (c) => { c.fillStyle = '#d8a830'; c.fillRect(0, 0, 64, 64); for (let i = 0; i < 40; i++) { c.fillStyle = pick(['#f2d070', '#b88820', '#ffe8a0']); c.fillRect(Math.random() * 64, Math.random() * 64, 8, 3); } });
    const panel = texMat('solar', 128, 64, (c) => { c.fillStyle = '#1a3a7a'; c.fillRect(0, 0, 128, 64); c.strokeStyle = '#8aa8d8'; c.lineWidth = 1; for (let x = 0; x < 128; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 64); c.stroke(); } for (let y = 0; y < 64; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.stroke(); } c.fillStyle = '#ffffff22'; c.fillRect(0, 0, 128, 18); });
    rbox(g, 0, 60, 0, 70, 90, 70, 6, foil);
    for (const s of [-1, 1]) { rod(g, [s * 35, 105, 0], [s * 70, 105, 0], 3, M(0xd8dde4), 6); box(g, s * 140, 70, 0, 140, 70, 4, panel); }
    lathe(g, 0, 150, 0, [[0.0, 0], [6, 0], [40, 28], [44, 34]], M(0xf2f4f6), 20).rotation.x = -0.4;
    rod(g, [0, 150, 0], [0, 230, 10], 2, M(0xd8dde4), 6); sph(g, 0, 232, 10, 5, M(0xe8343e, 1));
  } },
  iss: { name: '宇宙ステーション', tier: 10, yen: 150000000000, w: 1000, d: 320, h: 220, solid: false, build(g) {
    const panel = texMat('issSolar', 64, 128, (c) => { c.fillStyle = '#b8862a'; c.fillRect(0, 0, 64, 128); c.strokeStyle = '#6a4a14'; for (let y = 0; y < 128; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(64, y); c.stroke(); } c.fillStyle = '#d8a84a'; c.fillRect(30, 0, 4, 128); });
    const white = M(0xf2f4f6);
    rbox(g, 0, 100, 0, 1000, 22, 22, 6, M(0xc8ced8));
    for (const x of [-420, -300, 300, 420]) for (const z of [-1, 1]) box(g, x, 60, z * 85, 70, 4, 150, panel);
    for (const [x, len] of [[0, 260], [-60, 160], [60, 140]]) { const m = cyl(g, x, 100, -len / 2, 22, 22, len, white, 16); m.rotation.x = Math.PI / 2; m.position.set(x, 100, -len / 2 + 30); }
    for (const x of [-120, 120]) box(g, x, 120, 30, 90, 4, 60, M(0xf8f8f8));
    rbox(g, 0, 80, 150, 40, 40, 60, 12, white);
  } },
  rocket: { name: 'ロケット', tier: 10, yen: 80000000000, w: 180, d: 180, h: 840, build(g) {
    const body = texMat('rocketBody', 128, 512, (c, w, h) => {
      c.fillStyle = '#f7f7f2'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1a1a22'; for (let i = 0; i < 4; i++) c.fillRect(i * 32, h * 0.72, 16, h * 0.12);
      c.fillRect(0, h * 0.42, w, 6); c.fillRect(0, h * 0.62, w, 6);
      c.save(); c.translate(w * 0.25, h * 0.3); c.rotate(-Math.PI / 2); text(c, 'NEKO', 0, 0, 30, '#e8343e'); c.restore();
      c.save(); c.translate(w * 0.75, h * 0.3); c.rotate(-Math.PI / 2); text(c, 'NEKO', 0, 0, 30, '#e8343e'); c.restore();
    });
    lathe(g, 0, 0, 0, [[0.0, 0], [52, 0], [56, 40], [56, 520], [48, 600], [48, 650], [36, 720], [14, 800], [0.0, 830]], body, 24);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const f = box(g, Math.cos(a) * 70, 0, Math.sin(a) * 70, 6, 150, 60, M(0xe8343e)); f.rotation.y = -a + Math.PI / 2; }
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; lathe(g, Math.cos(a) * 26, -30, Math.sin(a) * 26, [[10, 0], [22, 30], [12, 32]], M(0x3a3f48), 12); }
    lathe(g, 0, -60, 0, [[0.0, 0], [40, 10], [70, 60], [0.0, 64]], glow(0xffa030, 1.4), 16);
  } },
  spaceufo: { name: 'UFO', tier: 10, yen: 99000000000, w: 440, d: 440, h: 170, solid: false, build(g) {
    lathe(g, 0, 0, 0, [[0.0, 0], [90, 6], [200, 40], [220, 56], [200, 70], [100, 86], [0.0, 90]], M(0xb8c0cc), 32);
    lathe(g, 0, 84, 0, [[100, 0], [96, 30], [60, 70], [0.0, 82]], new THREE.MeshBasicMaterial({ color: 0x8ad8f0, transparent: true, opacity: 0.6 }), 24);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; sph(g, Math.cos(a) * 205, 56, Math.sin(a) * 205, 9, M(pick([0xff5a5a, 0x5aff8a, 0xffe05a, 0x5ab8ff]), 1.5)); }
    sph(g, 0, 105, 0, 22, M(0x1a1a22)); for (const s of [-1, 1]) { const e = cyl(g, s * 12, 118, 0, 0, 9, 18, M(0x1a1a22), 4); e.rotation.z = -s * 0.4; }
    lathe(g, 0, -60, 0, [[0.0, 0], [120, 0], [70, 60], [0.0, 60]], new THREE.MeshBasicMaterial({ color: 0xf8ffb0, transparent: true, opacity: 0.25, depthWrite: false }), 24);
  } },
  asteroid: { name: '小惑星', tier: 10, yen: 5000000000, w: 420, d: 420, h: 380, build(g) {
    const rock = M(col(['#8a8278', '#7a7268', '#9a8a78', '#6a6660']));
    const geo = lumpy(2, rr(0, 10));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, rock); m.scale.set(200, 170, 190); m.position.y = 180; m.userData.outline = false; g.add(m);
    for (let i = 0; i < 5; i++) { const a = rr(0, 6.28); ico(g, Math.cos(a) * 170, 180 + rr(-90, 90), Math.sin(a) * 170, rr(20, 45), M(0x5a564e), 0); }
  } },

  // ───────── tier 11 ─────────
  moon: { name: '月', tier: 11, yen: 5000000000000000, w: 2400, d: 2400, h: 2400, build(g) {
    ball(g, 0, 0, 0, 1200, planetTex('moonTex', (c, w, h) => { c.fillStyle = '#c8c4bc'; c.fillRect(0, 0, w, h); blobs(c, w, h, 8, ['#9a968e', '#a8a49c'], 20, 50); craters(c, w, h, 90, '#bcb8b0', '#8a867e', '#e8e4dc'); }));
  } },
  earth: { name: '地球', tier: 11, yen: 100000000000000000, w: 2600, d: 2600, h: 2600, build(g) {
    ball(g, 0, 0, 0, 1300, planetTex('earthTex', (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a6ab8'); gr.addColorStop(0.5, '#1e5aa8'); gr.addColorStop(1, '#2a6ab8'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      blobs(c, w, h, 7, ['#4f9c56', '#6aa84a', '#c8a86a'], 18, 46);
      c.fillStyle = '#f4f8fc'; c.fillRect(0, 0, w, 18); c.fillRect(0, h - 18, w, 18);
    }));
    const clouds = texMat('earthClouds', 512, 256, (c, w, h) => { c.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 70; i++) { c.beginPath(); c.ellipse(Math.random() * w, h * 0.1 + Math.random() * h * 0.8, rr(10, 40), rr(4, 10), rr(-0.3, 0.3), 0, 7); c.fill(); } }, { transparent: true, depthWrite: false });
    ball(g, 0, -40, 0, 1340, clouds);
  } },
  mars: { name: '火星', tier: 11, yen: 3000000000000000, w: 2000, d: 2000, h: 2000, build(g) {
    ball(g, 0, 0, 0, 1000, planetTex('marsTex', (c, w, h) => { c.fillStyle = '#c8643a'; c.fillRect(0, 0, w, h); blobs(c, w, h, 10, ['#a84e2c', '#d8784a', '#8a3e24'], 12, 40); craters(c, w, h, 25, '#c06038', '#9a4a2a', '#e08a5a'); c.fillStyle = '#f4ece4'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 10, w, 10); }));
  } },
  venus: { name: '金星', tier: 11, yen: 3000000000000000, w: 2200, d: 2200, h: 2200, build(g) {
    ball(g, 0, 0, 0, 1100, planetTex('venusTex', (c, w, h) => { c.fillStyle = '#e8c890'; c.fillRect(0, 0, w, h); bands(c, w, h, ['#e8c890', '#f2d8a8', '#d8b078', '#f8e4c0'], 14); }));
  } },
  mercury: { name: '水星', tier: 11, yen: 1000000000000000, w: 1500, d: 1500, h: 1500, build(g) {
    ball(g, 0, 0, 0, 750, planetTex('mercuryTex', (c, w, h) => { c.fillStyle = '#a8988a'; c.fillRect(0, 0, w, h); craters(c, w, h, 120, '#9a8a7c', '#7a6c60', '#c8b8a8'); }));
  } },
  bigasteroid: { name: '巨大小惑星', tier: 11, yen: 500000000000000, w: 2000, d: 2000, h: 1700, build(g) {
    const geo = lumpy(3, rr(0, 10));
    const m = new THREE.Mesh(geo, M(col(['#7a7268', '#8a8070']))); m.scale.set(1000, 820, 900); m.position.y = 850; m.userData.outline = false; g.add(m);
  } },

  // ───────── tier 12 ─────────
  jupiter: { name: '木星', tier: 12, yen: 300000000000000000, w: 8000, d: 8000, h: 8000, build(g) {
    ball(g, 0, 0, 0, 4000, planetTex('jupiterTex', (c, w, h) => { bands(c, w, h, ['#d8b890', '#c89a6a', '#f2e4cc', '#a87a52', '#e8d0a8'], 10); c.fillStyle = '#c8603a'; c.beginPath(); c.ellipse(w * 0.62, h * 0.64, 36, 18, 0, 0, 7); c.fill(); c.fillStyle = '#e88a5a'; c.beginPath(); c.ellipse(w * 0.62, h * 0.64, 22, 10, 0, 0, 7); c.fill(); }));
  } },
  saturn: { name: '土星', tier: 12, yen: 300000000000000000, w: 7000, d: 7000, h: 7000, build(g) {
    ball(g, 0, 0, 0, 3500, planetTex('saturnTex', (c, w, h) => bands(c, w, h, ['#e8d8a8', '#d8c090', '#f2e4c0', '#c8b080'], 4)));
    const ringTex = texMat('saturnRing', 512, 512, (c, w, h) => {
      for (let r = 256; r > 140; r -= 2) { c.strokeStyle = `rgba(${200 + Math.random() * 40},${180 + Math.random() * 30},${140 + Math.random() * 30},${r > 230 || (r > 190 && r < 200) ? 0.15 : 0.75})`; c.lineWidth = 2.5; c.beginPath(); c.arc(256, 256, r, 0, 7); c.stroke(); }
    }, { transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(cg('satRing', () => { const ge = new THREE.PlaneGeometry(2, 2); ge.rotateX(-Math.PI / 2); return ge; }), ringTex);
    ring.scale.setScalar(7600); ring.position.y = 3500; ring.rotation.z = 0.35; ring.userData.outline = false; g.add(ring);
  } },
  uranus: { name: '天王星', tier: 12, yen: 200000000000000000, w: 5200, d: 5200, h: 5200, build(g) {
    ball(g, 0, 0, 0, 2600, planetTex('uranusTex', (c, w, h) => { c.fillStyle = '#9ad8e0'; c.fillRect(0, 0, w, h); bands(c, w, h, ['#9ad8e0', '#a8e0e8', '#8acad4'], 2); }));
    torus(g, 0, 2600, 0, 3400, 30, M(0x8ab0b8), Math.PI / 2 - 0.15, 0, Math.PI * 2, 64);
  } },
  neptune: { name: '海王星', tier: 12, yen: 200000000000000000, w: 5000, d: 5000, h: 5000, build(g) {
    ball(g, 0, 0, 0, 2500, planetTex('neptuneTex', (c, w, h) => { c.fillStyle = '#3a5ac8'; c.fillRect(0, 0, w, h); bands(c, w, h, ['#3a5ac8', '#4a6ad8', '#2a4ab0'], 3); c.fillStyle = '#1e348a'; c.beginPath(); c.ellipse(w * 0.4, h * 0.58, 26, 12, 0, 0, 7); c.fill(); }));
  } },
  sun: { name: '太陽', tier: 12, yen: 9990000000000000000, w: 18000, d: 18000, h: 18000, hp: 40, build(g) {
    const surf = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#ffb030'; c.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { c.fillStyle = pick(['#ffd060', '#ff9020', '#ffe890', '#ff7a10']); c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 0, 7); c.fill(); } });
    ball(g, 0, 0, 0, 9000, new THREE.MeshBasicMaterial({ map: surf }));
    const halo = texMat('sunHalo', 256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, 'rgba(255,200,80,0.8)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); }, { transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo.map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(30000); sp.position.y = 9000; g.add(sp);
  } },
};
