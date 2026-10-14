// 形と絵柄のヘルパー（角の丸い箱・回転体・多面体・ラベル用テクスチャ）
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { cg } from './geometry.js';
import { toon } from './materials.js';
import { canvasTex } from './textures.js';

const k3 = (v) => +v.toFixed(3);

// 角の丸い箱（y は底面）。r は角の半径
export function rbox(p, x, y, z, w, h, d, r, m, ol = false) {
  r = Math.min(r, w / 2, h / 2, d / 2) * 0.999;
  const geo = cg(`rb${k3(w)},${k3(h)},${k3(d)},${k3(r)}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
  const me = new THREE.Mesh(geo, m); me.position.set(x, y + h / 2, z); me.userData.outline = ol; p.add(me); return me;
}

// 回転体：pts は [[半径, 高さ], ...]（下から上へ）。y は底面
export function lathe(p, x, y, z, pts, m, seg = 20) {
  const key = 'la' + seg + pts.map(([a, b]) => k3(a) + ',' + k3(b)).join(';');
  const geo = cg(key, () => new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(r, 0.0001), h)), seg));
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.userData.outline = false; p.add(me); return me;
}

// 多面体の玉（葉っぱのかたまりなど）。flat なトゥーンで角ばった見た目にする
export function ico(p, x, y, z, r, m, detail = 1, sx = 1, sy = 1, sz = 1) {
  const geo = cg('ico' + detail, () => new THREE.IcosahedronGeometry(1, detail));
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.scale.set(r * sx, r * sy, r * sz); me.userData.outline = false; p.add(me); return me;
}

// ふたのない筒（ラベルを巻く用）。y は底面
export function tube(p, x, y, z, rt, rb, h, m, seg = 20) {
  const geo = cg(`tu${k3(rt)},${k3(rb)},${k3(h)},${seg}`, () => { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, true); g.translate(0, h / 2, 0); return g; });
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.userData.outline = false; p.add(me); return me;
}

// 円盤（ふた・皿・水面）。y は上面の高さ
export function disc(p, x, y, z, r, m, seg = 20) {
  const geo = cg(`di${k3(r)},${seg}`, () => { const g = new THREE.CircleGeometry(r, seg); g.rotateX(-Math.PI / 2); return g; });
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.userData.outline = false; p.add(me); return me;
}

// ドーナツ形（取っ手・タイヤ・リング）。向きは rx, ry で
export function torus(p, x, y, z, R, r, m, rx = 0, ry = 0, arc = Math.PI * 2, seg = 16) {
  const geo = cg(`to${k3(R)},${k3(r)},${k3(arc)},${seg}`, () => new THREE.TorusGeometry(R, r, 8, seg, arc));
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx, ry, 0); me.userData.outline = false; p.add(me); return me;
}

// テクスチャ付きトゥーン素材（キャッシュ）
const texMats = new Map();
export function texMat(key, w, h, draw, extra = {}) {
  if (texMats.has(key)) return texMats.get(key);
  const t = canvasTex(w, h, draw);
  const m = toon(0xffffff, 0, { map: t, ...extra });
  texMats.set(key, m); return m;
}
// 光って見えるテクスチャ（画面・看板）。トーンの影響を受けない
const glowMats = new Map();
export function screenMat(key, w, h, draw) {
  if (glowMats.has(key)) return glowMats.get(key);
  const m = new THREE.MeshBasicMaterial({ map: canvasTex(w, h, draw) });
  glowMats.set(key, m); return m;
}

// ───── 絵柄 ─────
export const FONT = '"Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif';
export function stripes(g, w, h, colors, vertical = false) {
  const n = colors.length;
  colors.forEach((c, i) => { g.fillStyle = c; vertical ? g.fillRect(i * w / n, 0, w / n + 1, h) : g.fillRect(0, i * h / n, w, h / n + 1); });
}
export function text(g, s, x, y, size, color, weight = 'bold', align = 'center') {
  g.fillStyle = color; g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
}

// ───── まとめて描く ─────
// グループの中のメッシュを、素材ごとに 1 つのメッシュへ合体する（描画回数を減らす）
// 戻り値は合体前の部品の [素材, 箱（グループ基準）] の一覧（壊した時の破片に使う）
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const KEEP = ['position', 'normal', 'uv'];
export function mergeGroup(g) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), m4 = new THREE.Matrix4();
  const buckets = new Map(), parts = [];
  g.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!KEEP.includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.morphAttributes = {}; geo.clearGroups();
    geo.applyMatrix4(m4.multiplyMatrices(inv, o.matrixWorld));
    geo.computeBoundingBox(); parts.push([o.material, geo.boundingBox.clone()]);
    const ol = o.userData.outline !== false, key = o.material.uuid + (ol ? '+' : '-');
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, ol, geos: [] });
    buckets.get(key).geos.push(geo);
  });
  for (const c of [...g.children]) if (!c.isSprite) g.remove(c);   // 光のスプライトなどはそのまま残す
  for (const { mat, ol, geos } of buckets.values()) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    for (const ge of geos) if (ge !== merged) ge.dispose();
    const me = new THREE.Mesh(merged, mat); me.userData.outline = ol; g.add(me);
  }
  return parts;
}

// 断面をつなぐ筒（角の丸い四角＝超楕円）。levels は [[半幅, 高さ], ...]（下から上）
// n が大きいほど四角に近く、2 で円。cap で上にふた。UV は u がまわり、v が高さ（0〜1）
export function loft(p, x, y, z, levels, m, n = 4, seg = 48, cap = true) {
  const key = 'lo' + n + ',' + seg + ',' + cap + levels.map(([a, h]) => k3(a) + ',' + k3(h)).join(';');
  const geo = cg(key, () => {
    const pos = [], uv = [], idx = [], H = levels[levels.length - 1][1] || 1, e = 2 / n;
    const sp = (t) => [Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** e, Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** e];
    levels.forEach(([a, h]) => { for (let j = 0; j <= seg; j++) { const [cx, cz] = sp(j / seg * Math.PI * 2); pos.push(cx * a, h, cz * a); uv.push(j / seg, h / H); } });
    for (let i = 0; i < levels.length - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + seg + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    if (cap) {
      const [a, h] = levels[levels.length - 1], c0 = pos.length / 3;
      pos.push(0, h, 0); uv.push(0.5, 1);
      for (let j = 0; j <= seg; j++) { const [cx, cz] = sp(j / seg * Math.PI * 2); pos.push(cx * a, h, cz * a); uv.push(0.5, 1); }
      for (let j = 0; j < seg; j++) idx.push(c0, c0 + j + 2, c0 + j + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  });
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.userData.outline = false; p.add(me); return me;
}
