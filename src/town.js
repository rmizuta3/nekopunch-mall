// モールの外の街。140m ごとの道路で区切られた区画を、モールから離れるほど大きな建物で埋める
//   1 周目：住宅街（一軒家・コンビニ・公園）
//   2 周目：マンション街（マンション・学校・病院）
//   3 周目：オフィス街（オフィスビル・ホテル・観覧車・スタジアム）
//   4 周目：超高層ビル街と ねこタワー
import * as THREE from 'three';
import { plane } from './core/geometry.js';
import { toon } from './core/materials.js';
import { canvasTex } from './core/textures.js';
import { rnd, rr, pick } from './core/random.js';

const BLOCK = 140, RING = 4, ROAD = 14;
const EDGE = BLOCK * (RING + 0.5);
export const LAND = 1700;   // 陸のはし（その先は海）
export const TOWN_BOUNDS = [-2500, 2500, -2500, 2500];
export const TOWER = [0, -BLOCK * RING];

export function buildTown(world, place) {
  // 道路（壊れない）
  const roadTex = canvasTex(64, 256, (g) => {
    g.fillStyle = '#55595f'; g.fillRect(0, 0, 64, 256);
    g.fillStyle = '#f2f2f2'; g.fillRect(30, 0, 4, 120);
    g.fillStyle = '#d8d2c4'; g.fillRect(0, 0, 4, 256); g.fillRect(60, 0, 4, 256);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(1, EDGE * 2 / 24);
  const roadMat = toon(0xffffff, 0, { map: roadTex });
  for (let k = -RING; k <= RING + 1; k++) {
    const p = (k - 0.5) * BLOCK;
    plane(world, p, -0.02, 0, ROAD, EDGE * 2, roadMat, 0, -Math.PI / 2).userData.outline = false;
    plane(world, 0, -0.019, p, ROAD, EDGE * 2, roadMat, Math.PI / 2, -Math.PI / 2).userData.outline = false;
  }

  // 街の外：浜辺と海
  const ring = (r0, r1, color, y) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 96), toon(color, 0, {})); m.rotation.x = -Math.PI / 2; m.position.y = y; m.userData.outline = false; world.add(m); };
  ring(LAND - 60, LAND + 20, 0xe8d8a8, -0.026); ring(LAND, 6000, 0x3a8ac8, -0.025);
  const rot = () => Math.floor(rnd() * 4);
  const lot = (cx, cz, ox, oz, j = 4) => [cx + ox + rr(-j, j), cz + oz + rr(-j, j)];
  // 区画のふちに並ぶ街路樹・電柱など
  const edgeDeco = (cx, cz, n, kinds) => {
    for (let i = 0; i < n; i++) {
      const side = i % 4, t = rr(-50, 50), e = 58;
      const [x, z] = side === 0 ? [cx + t, cz - e] : side === 1 ? [cx + t, cz + e] : side === 2 ? [cx - e, cz + t] : [cx + e, cz + t];
      place(pick(kinds), x, z, { rot: side < 2 ? 0 : 1 });
    }
  };
  const smalls = (cx, cz, n) => {
    for (let i = 0; i < n; i++) place(pick(['car', 'car', 'bicycle', 'mailbox', 'vending', 'shed', 'busstop', 'bus', 'truck']), cx + rr(-52, 52), cz + rr(-52, 52), { rot: rot() });
  };

  for (let bx = -RING; bx <= RING; bx++) for (let bz = -RING; bz <= RING; bz++) {
    const d = Math.max(Math.abs(bx), Math.abs(bz));
    if (d === 0) continue;   // まん中はモール
    const cx = bx * BLOCK, cz = bz * BLOCK;
    if (d === 1) {
      if (bx === -1 && bz === 0) {   // 公園
        place('bigtree', cx - 20, cz - 15); place('bigtree', cx + 18, cz + 22); place('bigtree', cx + 25, cz - 30);
        place('torii', cx, cz + 30); place('watertower', cx - 30, cz + 25);
        for (let i = 0; i < 8; i++) place('streettree', cx + rr(-45, 45), cz + rr(-45, 45));
        for (let i = 0; i < 6; i++) place('bench', cx + rr(-40, 40), cz + rr(-40, 40), { rot: rot() });
      } else if (bx === 1 && bz === 0) {   // コンビニとガソリンスタンド
        place('konbini', cx - 22, cz - 25); place('gasstation', cx + 20, cz + 20, { rot: 2 });
        for (const [ox, oz] of [[-30, 25], [25, -30]]) place('house', ...lot(cx, cz, ox, oz), { rot: rot() });
        smalls(cx, cz, 6);
      } else {
        // 住宅街は 4×4 で 16 軒（間が広すぎると、壊して回るのに時間がかかるので）
        for (const ox of [-45, -15, 15, 45]) for (const oz of [-45, -15, 15, 45]) place('house', ...lot(cx, cz, ox, oz, 2.5), { rot: rot() });
        if (rnd() < 0.5) place('konbini', ...lot(cx, cz, 0, 0, 1), { rot: rot() });
        smalls(cx, cz, 8);
      }
      edgeDeco(cx, cz, 18, ['streettree', 'streettree', 'pole', 'signal']);
    } else if (d === 2) {
      const r = rnd();
      if (r < 0.12) { place('school', cx, cz - 5); place('apartment', cx + 35, cz + 38, { rot: rot() }); }
      else if (r < 0.22) { place('hospital', cx - 15, cz); place('apartment', cx + 30, cz - 30, { rot: rot() }); }
      else {
        for (const [ox, oz] of [[-28, -28], [28, 28], [28, -28]]) place('apartment', ...lot(cx, cz, ox, oz, 3), { rot: rot() });
        for (const [ox, oz] of [[-45, 15], [-45, 45], [-15, 45], [-15, 15], [-45, -50], [5, -50]]) place('house', ...lot(cx, cz, ox, oz, 2), { rot: rot() });
      }
      if (rnd() < 0.2) place('pylon', cx + rr(-40, 40), cz + rr(-40, 40));
      edgeDeco(cx, cz, 12, ['streettree', 'pole', 'bigtree']);
      smalls(cx, cz, 5);
    } else if (d === 3) {
      if (bx === 2 && bz === 3) place('ferris', cx, cz);
      else if (bx === 3 && bz === -2) place('fujitv', cx, cz);
      else if (bx === -3 && bz === -2) {   // 太陽の塔のある公園
        place('taiyo', cx, cz);
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = rr(32, 52); place(rnd() < 0.3 ? 'bigtree' : 'streettree', cx + Math.cos(a) * r, cz + Math.sin(a) * r); }
      }
      else if (bx === -3 && bz === 1) place('stadium', cx, cz);
      else {
        for (const [ox, oz] of [[-26, -26], [26, 26]]) place(rnd() < 0.18 ? 'hotel' : 'office', ...lot(cx, cz, ox, oz, 3), { rot: rot() });
        place('apartment', ...lot(cx, cz, 28, -30, 3), { rot: rot() });
      }
      edgeDeco(cx, cz, 4, ['streettree', 'bigtree']);
    } else {
      if (bx === TOWER[0] / BLOCK && bz === TOWER[1] / BLOCK) { place('nekotower', cx, cz); continue; }
      if (bx === -2 && bz === -4) { place('azabudai', cx, cz); continue; }
      if (rnd() < 0.4) place('skyscraper', cx + rr(-8, 8), cz + rr(-8, 8));
      else for (const [ox, oz] of [[-27, -27], [27, 27]]) place('office', ...lot(cx, cz, ox, oz, 3), { rot: rot() });
    }
  }

  // ───── Lv.9：街の外（山・富士山・雲・タンカー・風車）─────
  place('fuji', 0, -1450);
  for (let i = 0, n = 0; n < 16 && i < 200; i++) {
    const a = rr(0, Math.PI * 2), r = rr(950, 1450), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z + 1450) < 1100) continue;   // 富士山のまわりはあける
    const k = rr(0.8, 1.25); place('mountain', x, z, { k, tall: rr(0.8, 1.2), w: 700 * k, d: 700 * k, h: 420 * k }); n++;
  }
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + 0.2, r = rr(760, 840); place('windmill', Math.cos(a) * r, Math.sin(a) * r, { rot: rot() }); }
  for (let i = 0; i < 12; i++) { const a = rr(0, Math.PI * 2), r = rr(700, 2100); place('cloud', Math.cos(a) * r, Math.sin(a) * r, { y: rr(260, 420), rot: rot() }); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5, r = rr(1950, 2350); place('tanker', Math.cos(a) * r, Math.sin(a) * r, { rot: rot() }); }
}
