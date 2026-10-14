// 宇宙ステージ（Lv.10〜）。地球のステージから遠く離れた場所（x = SPACE.x）に、天の川の床を敷いて並べる
// ねこは床の上を歩く。地球のすぐそばから始まり、北（-z）へ進むほど大きな星がある。いちばん奥が太陽
import * as THREE from 'three';
import { canvasTex } from './core/textures.js';
import { rnd, rr, pick } from './core/random.js';

export const SPACE = { x: 500000, start: [500000, 3200] };
export const SPACE_BOUNDS = [SPACE.x - 90000, SPACE.x + 90000, -110000, 30000];
export const SUN_POS = [SPACE.x, -80000];

export function buildSpace(world, place) {
  const X = SPACE.x;
  // 天の川の床（暗い紺に渦巻きの腕と星）
  const tex = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#05060f'; c.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 900; i++) {
      const t = i / 900, a = arm * Math.PI / 2 + t * 7, r = 20 + t * 480 + rr(-30, 30);
      const x = cx + Math.cos(a) * r + rr(-20, 20), y = cy + Math.sin(a) * r + rr(-20, 20);
      c.fillStyle = `rgba(${150 + rr(0, 100)},${140 + rr(0, 90)},${200 + rr(0, 55)},${0.05 + (1 - t) * 0.12})`;
      c.beginPath(); c.arc(x, y, rr(4, 16) * (1 - t * 0.5), 0, 7); c.fill();
    }
    const core = c.createRadialGradient(cx, cy, 0, cx, cy, 120); core.addColorStop(0, 'rgba(255,240,210,0.6)'); core.addColorStop(1, 'rgba(255,200,150,0)'); c.fillStyle = core; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(255,255,255,${rr(0.2, 0.9)})`; c.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(160000, 96), new THREE.MeshBasicMaterial({ map: tex }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(X, -0.5, -50000); floor.userData.outline = false; world.add(floor);

  // 置き方：着いた所（start）のまわり半径 CLEAR は何も置かない
  const [SX, SZ] = SPACE.start, CLEAR = 3500;   // 着いてすぐに物が見えるくらい（ねこと重ならない距離）
  const K = { 10: 2.2, 11: 2.0, 12: 1.6 };   // 宇宙の物は大きめに（その時のねこの半分くらい）
  const put = (kind, x, z, tier, opts = {}) => place(kind, x, z, { scale: K[tier], rot: Math.floor(rnd() * 4), ...opts });
  // 中心からの角度・距離で、着いた所に近すぎない場所をさがす
  const spot = (cx, cz, r0, r1, pad = 0) => {
    for (let i = 0; i < 40; i++) {
      const a = rr(0, Math.PI * 2), r = rr(r0, r1), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (Math.hypot(x - SX, z - SZ) > CLEAR + pad && z < SZ + 9000) return [x, z];
    }
    return [cx + r1, cz];
  };

  // ───── Lv.10：人工衛星・宇宙ステーション・ロケット・UFO・小惑星（着いた所のまわりにぎっしり）─────
  for (let i = 0; i < 34; i++) put('satellite', ...spot(SX, SZ, 3500, 13000), 10, { y: rr(300, 1400) });
  for (let i = 0; i < 6; i++) put('iss', ...spot(SX, SZ - 4000, 8000, 18000, 1000), 10, { y: rr(600, 1500) });
  for (let i = 0; i < 12; i++) put('rocket', ...spot(SX, SZ, 4000, 14000), 10);
  for (let i = 0; i < 8; i++) put('spaceufo', ...spot(SX, SZ - 6000, 11000, 19000), 10, { y: rr(300, 700) });
  for (let i = 0; i < 80; i++) put('asteroid', ...spot(SX, SZ - 3000, 3500, 18000), 10);

  // ───── Lv.11：月・地球・惑星（Lv.11 になると現れる）─────
  put('earth', SX - 9000, SZ - 16000, 11); put('moon', SX - 2000, SZ - 22000, 11);
  put('mercury', SX + 12000, SZ - 15000, 11); put('venus', SX + 16000, SZ - 26000, 11); put('mars', SX - 17000, SZ - 26000, 11);
  for (let i = 0; i < 12; i++) put('bigasteroid', ...spot(SX, SZ - 20000, 14000, 30000, 3000), 11);

  // ───── Lv.12：大きな惑星と太陽（Lv.12 になると現れる）─────
  put('jupiter', SX - 24000, SZ - 40000, 12); put('saturn', SX + 26000, SZ - 44000, 12);
  put('uranus', SX - 34000, SZ - 58000, 12); put('neptune', SX + 34000, SZ - 62000, 12);
  place('sun', SUN_POS[0], SUN_POS[1], { scale: 2 });
}

// 夜空の星（カメラについていく）
export function makeStars() {
  const n = 3000, pos = new Float32Array(n * 3), colr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * r, u, Math.sin(a) * r], i * 3);
    const c = pick([[1, 1, 1], [0.8, 0.9, 1], [1, 0.9, 0.75]]); colr.set(c, i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0, depthWrite: false }));
  pts.frustumCulled = false; pts.renderOrder = -1; pts.userData.outline = false;
  return pts;
}
