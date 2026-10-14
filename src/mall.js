// 世界の組み立て：ねこ部屋 → ショッピングモール → 街。置いた物はすべて壊せる（床と道路だけは残る）
import * as THREE from 'three';
import { PROPS as MALL_PROPS, makeClockTex } from './props.js';
import { ROOM_PROPS } from './propsRoom.js';
import { TOWN_PROPS } from './propsTown.js';
import { buildTown, TOWN_BOUNDS } from './town.js';
import { SPACE_PROPS } from './propsSpace.js';
import { buildSpace, makeStars, SUN_POS } from './space.js';
import { TIERS } from './config.js';
import { box, plane } from './core/geometry.js';
import { toon, basic } from './core/materials.js';
import { canvasTex, textTex } from './core/textures.js';
import { addOutlines } from './core/outline.js';
import { mergeGroup } from './core/shapes.js';
import { rnd, rr, pick } from './core/random.js';

// モールの内側
export const MALL = { x0: -32, x1: 32, z0: -22, z1: 22 };
export const BOUNDS = TOWN_BOUNDS;
// ねこ部屋（ペットショップの奥）
export const ROOM = { x0: 11, x1: 17.4, z0: -21.6, z1: -16.6 };
export const PROPS = { ...MALL_PROPS, ...ROOM_PROPS, ...TOWN_PROPS, ...SPACE_PROPS };
// 同じ名前の物があると、あとの方で上書きされてしまう（モールの UFO キャッチャーが宇宙の UFO になった）ので知らせる
{
  const seen = new Map();
  for (const [file, set] of [['props', MALL_PROPS], ['propsRoom', ROOM_PROPS], ['propsTown', TOWN_PROPS], ['propsSpace', SPACE_PROPS]])
    for (const k of Object.keys(set)) { if (seen.has(k)) console.warn(`[props] 「${k}」が ${seen.get(k)} と ${file} の両方にあります`); seen.set(k, file); }
}
export const START_POS = [13.1, -18.1];

export function buildMall(scene) {
  const root = new THREE.Group();
  const world = new THREE.Group(); root.add(world);
  const spaceWorld = new THREE.Group(); spaceWorld.visible = false; root.add(spaceWorld);   // 宇宙（Lv.10〜）
  let parent = world;
  const dynamics = [];
  const list = [];

  // ───── 光と空 ─────
  scene.background = new THREE.Color(0xcfe4f4);
  scene.fog = new THREE.Fog(0xcfe4f4, 30, 140);
  let area = 'room';   // 今置いている場所（レベルアップに必要な量の計算に使う）
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0x9a8f80, 1.55); root.add(hemi);
  const SKY = new THREE.Color(0xcfe4f4), BLACK = new THREE.Color(0x02030a);
  const sun = new THREE.DirectionalLight(0xfff0dd, 2.0); sun.position.set(12, 30, 18); root.add(sun); root.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);

  // ───── 床（壊れない）─────
  const tile = canvasTex(256, 256, (g) => {
    g.fillStyle = '#efe8dc'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#e4dccd'; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
    g.strokeStyle = '#d6cdbd'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128);
  });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(32, 22);
  const floor = plane(world, 0, 0, 0, MALL.x1 - MALL.x0 + 1.2, MALL.z1 - MALL.z0 + 1.2, toon(0xffffff, 0, { map: tile }), 0, -Math.PI / 2);
  floor.userData.outline = false;
  // 中央の円形タイル
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.2, 48), toon(0xd8c8a8, 0, {})); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.004, 6); ring.userData.outline = false; world.add(ring);
  // 外：駐車場と芝生
  const grass = plane(world, 0, -0.03, 0, 8000, 8000, toon(0x8ab86a), 0, -Math.PI / 2); grass.userData.outline = false;
  const asphalt = canvasTex(512, 128, (g) => {
    g.fillStyle = '#5a5f66'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#f2f2f2';
    for (let i = 0; i < 16; i++) g.fillRect(i * 32 + 1, 30, 3, 70);
  });
  const lot = plane(world, 0, -0.006, 29.5, 88, 13, toon(0xffffff, 0, { map: asphalt }), 0, -Math.PI / 2); lot.userData.outline = false;
  const walk = plane(world, 0, -0.016, 0, 76, 56, toon(0xd8d2c4), 0, -Math.PI / 2); walk.userData.outline = false;

  // ───── 置く ─────
  // kind: PROPS のキー、rot: 90° 単位の向き（0 = 正面が +z）
  // opts.on: 載せる台（たな・テーブル）。opts.level: たなの段、lx/lz: 台の中心からの位置
  function place(kind, x, z, opts = {}) {
    const def = PROPS[kind];
    if (!def) throw new Error('unknown prop ' + kind);
    const rot = opts.rot || 0, ry = rot * Math.PI / 2;
    const g = new THREE.Group();
    def.build(g, opts);
    const parts = mergeGroup(g);
    let y = opts.y ?? 0;
    if (opts.on) {
      const s = opts.on, tops = Array.isArray(s.def.top) ? s.def.top : [s.def.top];
      y = s.y + tops[opts.level || 0];
    }
    const sc = opts.scale || 1;   // 大きさの倍率（宇宙の物を大きくする時など）
    g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(sc);
    parent.add(g);
    const w = (opts.w || def.w) * sc, d = (opts.d || def.d) * sc;
    const [hw, hd] = rot % 2 ? [d / 2, w / 2] : [w / 2, d / 2];
    const tier = opts.tier || def.tier, T = TIERS[tier];
    const h = (opts.h || def.h) * sc;
    const b = {
      id: list.length, kind, def, name: def.name, tier, g, x, z, y, ry, h,
      hitY: y + (def.hitY || 0) * sc, sc,
      rect: [x - hw, x + hw, z - hd, z + hd],
      hp: def.hp || T.hp, maxHp: def.hp || T.hp, xp: T.xp, yen: opts.yen || def.yen, area: opts.area || area,
      solid: def.solid !== false && tier >= 2 && y < 0.3,
      support: opts.on || null, riders: [],
      broken: false, shake: 0, vy: 0, falling: false, fade: 1, mats: null, parts,
    };
    if (opts.on) opts.on.riders.push(b);
    // 小物は輪郭なし（描画を軽くする）
    g.userData.noOutline = true;
    if (tier >= 2) dynamics.push(g);
    // 背の高い物はカメラとねこの間に入ったら透ける
    if (h >= 2.3 || kind === 'header') {
      b.mats = [];
      g.traverse(o => {
        if (!o.isMesh || o.material.isShaderMaterial) return;
        const src = o.material, m = src.clone();
        m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey;
        m.transparent = true; m.userData.baseOpacity = src.opacity;
        o.material = m; o.userData.srcMat = src; b.mats.push(m);
      });
      g.updateMatrixWorld(true);
      b.box = new THREE.Box3().setFromObject(g);
    }
    list.push(b);
    return b;
  }
  const rot = () => Math.floor(rnd() * 4);
  // 台の上に載せる（lx, lz は台のローカル座標）
  function onTop(sup, kind, lx, lz, opts = {}) {
    const c = Math.cos(sup.ry), s = Math.sin(sup.ry);
    return place(kind, sup.x + lx * c + lz * s, sup.z - lx * s + lz * c, { rot: Math.round(sup.ry / (Math.PI / 2)) % 4, ...opts, on: sup });
  }
  // たなの全段に並べる
  function fillShelf(sh, kinds, n) {
    const tops = sh.def.top, W = sh.def.w - 0.4;
    tops.forEach((_, lv) => { for (let i = 0; i < n; i++) onTop(sh, pick(kinds), -W / 2 + W * (i + 0.5) / n + rr(-0.05, 0.05), 0.05, { level: lv }); });
  }
  // テーブルの上に小物
  function dress(t, kinds, n = 2) {
    const r = (t.def.w || 0.8) * 0.28;
    for (let i = 0; i < n; i++) onTop(t, pick(kinds), n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * r, rr(-0.12, 0.12));
  }
  // テーブルといす（左右）
  function tableSet(x, z, kinds, n = 2) {
    const t = place('table', x, z); dress(t, kinds, n);
    place('chair', x - 0.75, z, { rot: 1 }); place('chair', x + 0.75, z, { rot: 3 });
    return t;
  }
  // かべの列（x 一定 or z 一定）。openings: [[from, to, label?], ...]。開口部の上には看板
  function wallLine(a, b, fixed, axis, opts = {}) {
    const H = opts.h || 6, kind = opts.kind || 'wall', segs = [];
    const openings = (opts.openings || []).slice().sort((p, q) => p[0] - q[0]);
    let cur = a;
    for (const [o0, o1] of openings) { if (o0 > cur) segs.push([cur, o0]); cur = o1; }
    if (cur < b) segs.push([cur, b]);
    const put = (k, c, len, extra) => axis === 'x'
      ? place(k, c, fixed, { rot: opts.rot ?? 0, w: len, ...extra })
      : place(k, fixed, c, { rot: opts.rot ?? 1, w: len, ...extra });
    for (const [s0, s1] of segs) {
      const n = Math.max(1, Math.round((s1 - s0) / (opts.seg || 4))), len = (s1 - s0) / n;
      for (let i = 0; i < n; i++) put(kind, s0 + len * (i + 0.5), len, { h: H, color: opts.color, stripe: opts.stripe, tier: opts.tier });
    }
    const hy = opts.doorH || 4.2;
    for (const [o0, o1, label] of openings) put('header', (o0 + o1) / 2, o1 - o0, { y: hy, h: H - hy, label, tier: opts.headerTier, color: opts.color, signBg: opts.signBg, signFg: opts.signFg });
  }

  // 床に小物をばらまく（台や家具と重ならない所に）
  const blocked = (x, z, r = 0.2) => list.some(b => b.tier >= 2 && !b.support && x > b.rect[0] - r && x < b.rect[1] + r && z > b.rect[2] - r && z < b.rect[3] + r);
  const scatter = (n, x0, x1, z0, z1, kinds, avoid = [0, 19.5]) => {
    for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) {
      const x = rr(x0, x1), z = rr(z0, z1);
      if (blocked(x, z) || Math.hypot(x - avoid[0], z - avoid[1]) < 0.8) continue;
      place(pick(kinds), x, z, { rot: Math.floor(rnd() * 4) }); i++;
    }
  };

  // ───── ねこ部屋（スタート地点。ペットショップの奥）─────
  {
    const R = ROOM, cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;
    const wood = canvasTex(256, 256, (g) => {
      g.fillStyle = '#c8945a'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#bc8a52' : '#d09c62'; g.fillRect(0, i * 32, 256, 30); g.fillStyle = '#a8784a'; g.fillRect((i * 97) % 256, i * 32, 2, 30); }
    });
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(3, 3);
    plane(world, cx, 0.003, cz, R.x1 - R.x0, R.z1 - R.z0, toon(0xffffff, 0, { map: wood }), 0, -Math.PI / 2).userData.outline = false;
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), toon(0xd87a8a, 0, {})); rug.rotation.x = -Math.PI / 2; rug.position.set(14.2, 0.006, -19.3); rug.scale.set(1.3, 1, 1); rug.userData.outline = false; world.add(rug);
    const wl = { kind: 'roomwall', h: 2.6, seg: 1.6 };
    wallLine(R.x0, R.x1, R.z0, 'x', wl);
    wallLine(R.z0 + 0.07, R.z1 - 0.07, R.x0, 'z', { ...wl, rot: 1 });
    wallLine(R.z0 + 0.07, R.z1 - 0.07, R.x1, 'z', { ...wl, rot: 3 });
    wallLine(R.x0, 13.7, R.z1, 'x', { ...wl, rot: 2 }); place('door', 14.2, R.z1, { rot: 2 }); wallLine(14.7, R.x1, R.z1, 'x', { ...wl, rot: 2 });

    const sofa = place('sofa', 12.3, -20.9); onTop(sofa, 'teddy', -0.5, 0.05); onTop(sofa, 'remote', 0.4, 0.1); onTop(sofa, 'zabuton', 0.1, 0);
    const ts = place('tvstand', 15.8, -21.25); onTop(ts, 'tv', 0, 0); onTop(ts, 'clock', 0.55, 0.05); onTop(ts, 'game', -0.5, 0.05);
    const lt = place('lowtable', 14.2, -19.4); onTop(lt, 'mug', -0.2, 0.1); onTop(lt, 'tissue', 0.2, -0.15);
    for (let i = 0; i < 3; i++) onTop(lt, 'mikan', -0.05 + i * 0.09, 0.15); onTop(lt, 'remote', 0.15, 0.2); onTop(lt, 'snack', -0.25, -0.2);
    for (const [x, z] of [[13.3, -19.4], [15.1, -19.4], [14.2, -18.5]]) place('zabuton', x, z, { rot: rot() });
    const ct = place('cattower', 11.6, -17.35); onTop(ct, 'yarn', 0.1, 0.1, { level: 0 }); onTop(ct, 'mouse', -0.1, -0.1, { level: 1 }); onTop(ct, 'yarn', -0.15, -0.15, { level: 2 });
    const dk = place('desk', 16.65, -19.3, { rot: 3 }); onTop(dk, 'laptop', 0, -0.1); onTop(dk, 'desklamp', 0.1, -0.45); onTop(dk, 'pens', -0.1, 0.4); onTop(dk, 'mug', 0.15, 0.3);
    place('chair', 15.95, -19.3, { rot: 1 });
    for (const z of [-17.2, -17.75]) { const cb = place('colorbox', 17.15, z, { rot: 3 }); onTop(cb, 'book', 0, 0, { level: 1 }); onTop(cb, pick(['snack', 'catfood', 'yarn']), 0, 0, { level: 2 }); onTop(cb, pick(['clock', 'mug', 'pot']), 0, 0, { level: 3 }); }
    const mf = place('minifridge', 11.45, -18.6); onTop(mf, 'ricecooker', 0, 0);
    place('fan', 12.6, -17.25);
    const cb1 = place('cardboard', 16.85, -20.55, { rot: 1 }); const cb2 = onTop(cb1, 'cardboard', 0, 0); onTop(cb2, 'snack', 0, 0);
    place('cardboard', 16.85, -21.15, { rot: 1 });
    place('bed', 14.75, -17.25); place('smallbin', 15.6, -17.0);
    place('slipper', 13.55, -17.0, { rot: 1 }); place('slipper', 13.85, -17.05, { rot: 1 });
    scatter(16, R.x0 + 0.4, R.x1 - 0.4, R.z0 + 0.4, R.z1 - 0.4, ['yarn', 'mouse', 'catfood', 'catfood', 'ball', 'mikan', 'book', 'snack', 'duck', 'block', 'game', 'mug'], START_POS);
  }
  area = 'mall';

  // ───── 外壁 ─────
  wallLine(-32.6, 32.6, -22.3, 'x', { h: 8, color: '#efe6d6', stripe: '#c8a85a' });
  wallLine(-22, 22, -32.3, 'z', { h: 8, color: '#efe6d6', stripe: '#c8a85a', rot: 1 });
  wallLine(-22, 22, 32.3, 'z', { h: 8, color: '#efe6d6', stripe: '#c8a85a', rot: 3 });
  wallLine(-32.6, 32.6, 22.3, 'x', { h: 8, kind: 'glasswall', rot: 2, doorH: 5, openings: [[-4, 4, 'ねこパンチモール']], color: '#6a7480', signBg: '#2a3a5a', signFg: '#ffe7a0' });

  // ───── 北の専門店（4 軒）─────
  const shops = [
    { x0: -20, label: 'CAFE ねこまんま', color: '#c89a6a', bg: '#5a3a24', fg: '#ffe7c0' },
    { x0: -10, label: 'ファッション NYA', color: '#e8b8c8', bg: '#ffffff', fg: '#c04a7a' },
    { x0: 0, label: 'でんきのニャマダ', color: '#a8c8e8', bg: '#e8343e', fg: '#ffffff' },
    { x0: 10, label: 'ペットショップ にゃんこ堂', color: '#f2d27a', bg: '#4aa3e0', fg: '#ffffff' },
  ];
  for (const s of shops) {
    wallLine(s.x0, s.x0 + 2, -14, 'x', { color: s.color, tier: 4 });
    wallLine(s.x0 + 8, s.x0 + 10, -14, 'x', { color: s.color, tier: 4 });
    place('header', s.x0 + 5, -14, { y: 4.2, h: 1.8, w: 6, label: s.label, color: s.color, signBg: s.bg, signFg: s.fg });
  }
  for (const x of [-10, 0, 10]) wallLine(-21.7, -14.3, x, 'z', { color: '#efe6d6', tier: 4 });
  wallLine(-21.7, -14.3, 20, 'z', { color: '#efe6d6', rot: 3, tier: 4 });

  // カフェ
  { const c = place('counter', -15, -20.6); onTop(c, 'coffeemac', -1.0, 0); for (let i = 0; i < 3; i++) onTop(c, 'cup', 0.1 + i * 0.25, 0.1); for (let i = 0; i < 3; i++) onTop(c, 'cake', 0.9 + i * 0.22, -0.05);
    place('stool', -16.5, -19.6); place('stool', -15.5, -19.6); place('stool', -14.5, -19.6);
    tableSet(-17.6, -17, ['cup', 'cake', 'donut']); tableSet(-12.4, -17, ['cup', 'cake', 'donut']); tableSet(-15, -15.6, ['cup', 'donut']);
    place('planter', -19.3, -21.2); place('planter', -10.7, -21.2); }
  // 洋服
  { for (const x of [-8.5, -5, -1.5]) place('mannequin', x, -20.8);
    place('rack', -7.5, -18.2); place('rack', -2.5, -18.2);
    const t = place('displaytable', -5, -16.3); onTop(t, 'hat', -0.45, 0); onTop(t, 'hat', 0, 0.1); onTop(t, 'shoe', 0.45, -0.1); onTop(t, 'shoe', 0.45, 0.15);
    for (let i = 0; i < 4; i++) place('shoe', -8.6 + i * 0.35, -15.4, { rot: 1 });
    place('bag', -1.6, -15.5); place('bag', -1.2, -15.6); }
  // 家電
  { for (const x of [1.2, 2.5, 3.8]) { const t = place('tv', x, -21.2); }
    for (const x of [6.4, 7.4, 8.4]) place('fridge', x, -21.2);
    place('washer', 1.6, -18); place('washer', 2.5, -18); place('washer', 3.4, -18);
    const d = place('displaytable', 7, -17.8); for (let i = 0; i < 5; i++) onTop(d, 'phone', -0.55 + i * 0.27, 0.05);
    place('tv', 7, -15.6, { rot: 2 }); place('atm', 9.3, -15.4, { rot: 3 }); }
  // ペットショップ（奥はねこ部屋）
  { for (let i = 0; i < 4; i++) place('gacha', 19.3, -15.4 - i * 0.62, { rot: 3 });
    const t = place('displaytable', 12.4, -15.3); for (let i = 0; i < 5; i++) onTop(t, pick(['catfood', 'catfood', 'mouse', 'yarn']), -0.55 + i * 0.27, rr(-0.15, 0.15));
    const t2 = place('displaytable', 15.6, -15.3); for (let i = 0; i < 4; i++) onTop(t2, pick(['catfood', 'ball', 'duck']), -0.5 + i * 0.33, rr(-0.15, 0.15));
    place('cattower', 18.5, -21.0); place('cattower', 18.5, -19.9); place('bed', 18.4, -18.6); place('bed', 18.4, -17.8);
    for (let i = 0; i < 5; i++) place(pick(['catfood', 'yarn', 'mouse', 'ball']), rr(10.8, 17.5), rr(-16.2, -14.8)); }

  // ───── 西：スーパーと本屋 ─────
  wallLine(-22, 22, -20, 'z', { color: '#d8e8d0', tier: 4, openings: [[-11, -3, 'スーパー まるまる'], [9, 15, 'ニャン堂書店']], signBg: '#2a8a4a', signFg: '#ffffff' });
  wallLine(-31.7, -20.3, 4, 'x', { color: '#efe6d6', tier: 4 });
  for (const x of [-30.2, -27.8, -25.4, -23]) place('showcase', x, -21.3);
  for (const x of [-29.5, -25.5]) for (const z of [-17.5, -13.5, -9.5, -5.5]) { const s = place('shelf', x, z); fillShelf(s, ['can', 'can', 'bottle'], 4); }
  place('register', -22.4, -0.6, { rot: 1 }); place('register', -22.4, 2.2, { rot: 1 });
  for (let i = 0; i < 3; i++) place('cart', -21.2, -15.5 + i * 1.0);
  for (let i = 0; i < 3; i++) place('basket', -22.2, -12.5 + i * 0.5);
  for (let i = 0; i < 5; i++) place(pick(['can', 'bottle']), rr(-31, -22), rr(-20, 0));
  // 本屋
  for (const x of [-29.5, -25.5]) for (const z of [7, 11]) { const s = place('bookshelf', x, z); fillShelf(s, ['book'], 4); }
  { const t = place('longtable', -28, 17); dress(t, ['book'], 4); place('sofa', -24.5, 17.5); place('planter', -31, 21); place('planter', -21, 21); place('stool', -26.5, 15.6); place('stool', -29.5, 15.6); }

  // ───── 東：フードコート ─────
  [['ラーメン', '#e8574a'], ['たこ焼き', '#f2a93b'], ['カレー', '#c8a040'], ['ハンバーガー', '#4aa3e0']]
    .forEach(([label, color], i) => place('foodstall', 30.6, -16 + i * 8, { rot: 3, label, color }));
  for (const x of [23, 26.2]) for (const z of [-17, -11, -5, 1, 7, 13, 19]) tableSet(x, z, ['ramen', 'tray', 'cup']);
  place('bin', 21, -20.5); place('bin', 21, 20.5); place('planter', 28, 20.6); place('planter', 21, 10);

  // ───── 中央アトリウム ─────
  const clockTex = makeClockTex();
  place('clocktower', 0, -7, { clockTex });
  const fountain = place('fountain', 0, 6);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3; onTop(fountain, 'duck', Math.cos(a) * 2.55, Math.sin(a) * 2.55); }
  for (const [x, z] of [[-14, -6], [14, -6], [-14, 14], [14, 14]]) place('pillar', x, z);
  place('escalator', 10, 4);
  place('car', -9, 4, { rot: 1, color: 0xe8343e });
  place('xmastree', -9, -3);
  place('kiosk', -6, 15.2, { label: 'クレープ', color: '#f28aa0' });
  place('kiosk', 6, 15.2, { label: 'アイス', color: '#4aa3e0' });
  for (const k of list.filter(b => b.kind === 'kiosk')) for (let i = 0; i < 3; i++) onTop(k, 'cup', -0.6 + i * 0.6, 0.55);
  place('palm', -17.5, 4); place('palm', 17.5, 4);
  place('stage', -10.5, -10.6, { rot: 0 });
  place('bigbear', -16.2, -11);
  place('bigsign', 0, 1, { label: 'SUMMER SALE' }); place('bigsign', 0, 18.5, { label: 'WELCOME!' });

  // ベンチと、その上の小物
  const benches = [[-4.3, 6, 1], [4.3, 6, 3], [0, 10.6, 2], [0, 1.4, 0], [-5, -11, 0], [5, -11, 0], [-11, 19.5, 2], [11, 19.5, 2], [-16, 9, 1], [16, 9, 3]];
  for (const [x, z, rot] of benches) {
    const b = place('bench', x, z, { rot });
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) onTop(b, pick(['can', 'cup', 'bag', 'donut', 'teddy', 'bottle']), rr(-0.8, 0.8), 0.05);
  }
  for (let i = 0; i < 3; i++) place('vending', -19.1, 17.2 + i * 1.05, { rot: 1 });
  place('atm', -19.2, -12.6, { rot: 1 });
  for (let i = 0; i < 5; i++) place('gacha', 19.3, 0 + i * 0.62, { rot: 3 });
  place('ufo', 17.2, -11.6); place('ufo', 15.8, -11.6);
  place('piano', -16.5, 0.5, { rot: 1 });
  // ポスター（写真は使わず、ここで描く）：夏空と黒ねこのシルエット
  const posterTex = canvasTex(512, 340, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#4aa8e8'); sky.addColorStop(0.7, '#bfe6ff'); sky.addColorStop(1, '#ffe7a0'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(420, 70, 42, 0, 7); c.fill();
    c.fillStyle = '#ffffff'; for (const [x, y, r] of [[90, 60, 26], [120, 52, 32], [152, 62, 24], [300, 96, 18], [322, 90, 22]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    c.fillStyle = '#6ac04a'; c.beginPath(); c.moveTo(0, h); c.quadraticCurveTo(w * 0.3, h - 90, w * 0.6, h - 50); c.quadraticCurveTo(w * 0.85, h - 20, w, h - 70); c.lineTo(w, h); c.fill();
    // 黒ねこ（ドット風の四角で）
    c.fillStyle = '#1a1a22'; const px = 9, cx = 330, cy = 170;
    const cat = ['X......X....', 'XX....XX....', 'XXXXXXXX..XX', 'XXXXXXXX..X.', 'XXXXXXXX.XX.', 'XXXXXXXXXX..', '.XXXXXXXXX..', '.XXXXXXXXX..', '.X.X..X.X...', '.X.X..X.X...'];
    cat.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') c.fillRect(cx + i * px, cy + j * px, px, px); }));
    c.fillStyle = '#ffd84a'; c.fillRect(cx + 2 * px, cy + 4 * px, px, px); c.fillRect(cx + 5 * px, cy + 4 * px, px, px);
    c.fillStyle = '#ffffff'; c.fillRect(cx + px, cy + 6 * px, 8 * px, px * 0.8);
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = '#ffffff'; c.strokeStyle = '#c0406a'; c.lineWidth = 8; c.font = 'bold 52px "Hiragino Maru Gothic ProN", sans-serif';
    c.strokeText('夏の大セール', 28, 160); c.fillText('夏の大セール', 28, 160);
    c.font = 'bold 30px "Hiragino Maru Gothic ProN", sans-serif'; c.lineWidth = 6; c.strokeText('ぜんぶ 半額にゃ', 34, 222); c.fillText('ぜんぶ 半額にゃ', 34, 222);
  });
  place('poster', 13.2, -1, { rot: 3, posterTex });
  for (const [x, z] of [[-8, -12.6], [8, -12.6], [-18.5, -2], [18.5, -9], [-4, 20.8], [4, 20.8], [-12, 0], [12, 10.5], [-18.6, 13], [18.6, 13]]) place('planter', x, z);
  for (const [x, z] of [[-6.5, 10.5], [6.5, 10.5], [-3, -11.5], [3, -11.5], [-12, 16.5], [12, 16.5], [-18.6, -8]]) place('bin', x, z);
  for (const [x, z] of [[3.4, 9.6], [-3.4, 9.4], [3.5, 2.6]]) place('cone', x, z);
  for (const [x, z] of [[-15, -12.6], [-5, -12.6], [5, -12.6], [15, -12.8], [-18.6, -6.5], [-18.6, 12]]) place('aframe', x, z);
  place('balloonstand', -2.6, 17.4); place('balloonstand', 2.6, 17.4);
  place('sofa', 9.5, 18.5, { rot: 2 }); place('cart', -14, 20.4, { rot: 1 }); place('cart', -13, 20.4, { rot: 1 });
  for (const x of [-18, -16, -14, -10, -8, 8, 10, 14, 16, 18]) place('pot', x, 21.4);
  // 追加の物：消火器・案内板・プリ機・マッサージチェア・ベビーカーなど
  for (const [x, z, r] of [[-19.5, -13.3, 1], [19.5, -13.3, 3], [-19.5, 21.4, 1], [19.5, 21.4, 3], [-31.5, -1, 1], [31.5, 21.3, 3], [-0.6, -21.5, 0], [9.5, -21.6, 0], [-9.5, -21.6, 0]]) place('extinguisher', x, z, { rot: r });
  place('mapboard', -6, 20.2, { rot: 2 }); place('mapboard', 18.8, -4, { rot: 3 }); place('mapboard', -18.8, 6.5, { rot: 1 });
  place('photobooth', 16.8, -8.2, { rot: 3 });
  for (const x of [4.6, 5.6]) place('massage', x, -18.2, { rot: 2 });
  place('umbrellastand', -5.2, 21.5); place('umbrellastand', 5.2, 21.5);
  for (const [x, z, r] of [[-13.5, 9.5, 1], [7.8, 21, 0], [-25, 14.5, 0]]) place('stroller', x, z, { rot: r });
  place('massage', 29.5, 12.4, { rot: 2 });

  // 入口まわりに散らばった小物
  scatter(40, -16, 16, 11, 21, ['can', 'bottle', 'bag', 'ball', 'duck', 'cup', 'donut', 'pot', 'shoe', 'teddy', 'block']);
  scatter(24, -18, 18, -12, 11, ['can', 'bottle', 'bag', 'ball', 'cup', 'pot', 'hat', 'book']);
  scatter(10, 21, 29, -21, 21, ['cup', 'can', 'tray', 'bag']);
  scatter(14, -18, 18, -13, 21, ['suitcase', 'umbrella', 'extinguisher', 'snack', 'mug', 'bag', 'yarn']);

  // ───── 外：駐車場 ─────
  const carColors = [0xe8343e, 0x3a7ad8, 0xf2f2f2, 0xf2c030, 0x3b3f4a, 0x5cbf6a, 0x8a6ad8, 0x2a2f3a];
  [-34, -28, -22, -16, 16, 22, 28, 34].forEach((x, i) => place('car', x + rr(-0.3, 0.3), 30.5, { rot: rnd() < 0.5 ? 0 : 2, color: carColors[i] }));
  for (const [x, z] of [[-8, 25.5], [8, 25.5], [-25, 25.5], [25, 25.5], [-40, 33], [40, 33], [-40, 0], [40, 0]]) place('lamppost', x, z, { rot: 2 });
  for (const [x, z] of [[-38, 24], [38, 24], [-38, -12], [38, -12], [-12, -27], [12, -27], [-30, -28], [30, -28]]) place('palm', x, z);
  for (const [x, z] of [[-3, 26], [3, 26], [-1, 27.5], [1, 27.5]]) place('cone', x, z);
  for (let i = 0; i < 8; i++) place(pick(['can', 'bag', 'bottle', 'ball']), rr(-30, 30), rr(24, 34));
  for (let i = 0; i < 10; i++) place('bicycle', -6 + i * 0.7, 23.6, { rot: 0 });
  place('mailbox', 6.5, 23.8); place('busstop', 12, 24.2); place('vending', 15, 23.6, { rot: 2 }); place('vending', 16.1, 23.6, { rot: 2 });

  // ───── 街 ─────
  area = 'town';
  buildTown(world, place);

  // ───── 宇宙 ─────
  area = 'space'; parent = spaceWorld;
  buildSpace(spaceWorld, place);
  parent = world;
  const stars = makeStars(); root.add(stars);

  addOutlines(root, world, dynamics);
  // 影：輪郭線・半透明の物は影を落とさない。床はうける
  root.traverse(o => {
    if (!o.isMesh || o.material.isShaderMaterial || o.isLineSegments2) return;
    const m = o.material, clear = (m.transparent && m.opacity < 0.9) || m.isMeshBasicMaterial;
    o.receiveShadow = true; o.castShadow = !clear; o.userData.clear = clear;
    // 床・道路・海など（壊せない平らな物）は影を落とさない。自分の影で地面がチカチカするので
    if (o.parent === world || o.parent === spaceWorld) { o.castShadow = false; o.userData.clear = true; }
  });
  for (const b of list) if (b.tier === 1) b.g.traverse(o => { o.castShadow = false; });   // 小物の影は省く（軽くする）

  // ───── 毎フレーム：カメラとねこの間の物を透けさせる ─────
  const ray = new THREE.Ray(), hit = new THREE.Vector3(), tmp = new THREE.Vector3(), aim = new THREE.Vector3();
  const tall = list.filter(b => b.mats);
  // ねこの中心と頭の 2 点へ向けた線のどちらかをさえぎる物を透けさせる
  const side = new THREE.Vector3();
  const blocks = (b, camera, hero, k, sx = 0) => {
    aim.set(hero.position.x + side.x * sx, hero.position.y + hero.height * k, hero.position.z + side.z * sx);
    ray.origin.copy(camera.position); tmp.copy(aim).sub(camera.position);
    const dist = tmp.length(); ray.direction.copy(tmp).normalize();
    return ray.intersectBox(b.box, hit) && hit.distanceTo(camera.position) < dist - hero.radius;
  };
  let cullT = 0;
  // 影を落とす範囲をねこのまわりに合わせる（大きくなるほど広く）
  const SUN_DIR = new THREE.Vector3(12, 30, 18).normalize(), _d = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function followSun(target, D) {
    const cam = sun.shadow.camera, r = D * 1.4;
    // 宇宙では太陽のある方から照らす
    if (api.inSpace) { _d.set(SUN_POS[0] - target.x, 0, SUN_POS[1] - target.z); const l = _d.length() || 1; SUN_DIR.set(_d.x / l, 0.7, _d.z / l).normalize(); }
    // 影の 1 ドット単位で位置をそろえる（光から見た左右・上下の向きで丸める）
    // ねこを追って影の範囲が少しずつずれると、影のふちがちらつくため
    const texel = (2 * r) / sun.shadow.mapSize.x;
    _right.crossVectors(UP, SUN_DIR).normalize(); _up.crossVectors(SUN_DIR, _right);
    const u = Math.round(target.dot(_right) / texel) * texel, v = Math.round(target.dot(_up) / texel) * texel, w = target.dot(SUN_DIR);
    sun.target.position.copy(_right).multiplyScalar(u).addScaledVector(_up, v).addScaledVector(SUN_DIR, w);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, D * 4);
    if (Math.abs(cam.right - r) > r * 0.05) {
      cam.left = cam.bottom = -r; cam.right = cam.top = r; cam.near = D * 0.5; cam.far = D * 8; cam.updateProjectionMatrix();
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = D * 0.004;
    }
  }
  // 空の色：0 = 地球の青空、1 = 宇宙の黒（飛び出す時に少しずつ変える）
  function setSky(k, scene) {
    scene.background.copy(SKY).lerp(BLACK, k); scene.fog.color.copy(scene.background);
    hemi.intensity = 1.55 - k * 1.05; stars.material.opacity = k;
  }
  function enterSpace(scene) {
    world.visible = false; spaceWorld.visible = true; api.inSpace = true; setSky(1, scene);
    sun.intensity = 2.6; sun.color.set(0xfff2d8);
  }
  const easeBack = (x) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
  function update(dt, t, camera, hero) {
    // 現れた物はポンッと大きくなる
    for (const b of list) if (b.popT !== undefined && b.popT < 1) { b.popT = Math.min(1, b.popT + dt * 1.2); b.g.visible = true; b.g.scale.setScalar(b.sc * Math.max(0.01, easeBack(b.popT))); }
    if (stars.material.opacity > 0) { stars.position.copy(camera.position); stars.scale.setScalar(camera.far * 0.6); }
    // ねこよりずっと小さい物は描かない（豆つぶより小さいので見えない）
    if ((cullT -= dt) <= 0) {
      cullT = 0.4; const min = hero.height * 0.03, shadowMin = hero.height * 0.1;
      for (const b of list) {
        if (b.broken) continue;
        b.g.visible = !b.hidden && b.h > min;
        // 影もねこにくらべて小さい物は省く（見えないので）
        const cast = b.tier > 1 && b.h > shadowMin;
        if (b.casting !== cast) { b.casting = cast; b.g.traverse(o => { if (o.isMesh && !o.isLineSegments2 && !o.material.isShaderMaterial) o.castShadow = cast && !o.userData.clear; }); }
      }
    }
    // 足もとの左右も見えるように（部屋の手前のかべなど）
    side.set(camera.position.z - hero.position.z, 0, hero.position.x - camera.position.x).normalize();
    const s = hero.height * 1.2;
    for (const b of tall) {
      if (b.broken || !b.g.visible) continue;
      const goal = blocks(b, camera, hero, 0.4) || blocks(b, camera, hero, 1.0) || blocks(b, camera, hero, 0, s) || blocks(b, camera, hero, 0, -s) || blocks(b, camera, hero, 0, 0) ? 0.18 : 1;
      if (b.fade === goal) continue;
      let f = THREE.MathUtils.damp(b.fade, goal, 10, dt);
      if (Math.abs(f - goal) < 0.01) f = goal;
      b.fade = f;
      for (const m of b.mats) m.opacity = m.userData.baseOpacity * f;
    }
  }

  const api = { root, list, update, followSun, sun, clockTex, setSky, enterSpace, inSpace: false };
  return api;
}
