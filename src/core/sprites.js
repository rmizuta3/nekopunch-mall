// ドット絵スプライト（HD-2D 方式のビルボード用テクスチャを作る）
import * as THREE from 'three';
import { PIX } from '../config.js';
import { loadAseprite } from './aseprite.js';

export function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('画像を読み込めません: ' + src)); i.src = src; });
}
const toHex = (c) => typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c;
export const nearestTex = (canvas) => {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
// 絵の下端が y=0 に来る板（scale でドットの大きさを変える）
function spriteGeo(W, H, bottom, scale = 1) {
  const px = PIX * scale;
  const geo = new THREE.PlaneGeometry(W * px, H * px);
  geo.translate(0, H * px / 2 - (H - 1 - bottom) * px, 0);
  return geo;
}
// 一番下の不透明な行
function bottomRow(canvas) {
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let bottom = 0, top = canvas.height;
  for (let i = 3; i < d.length; i += 4) if (d[i] >= 128) { const y = Math.floor(i / 4 / canvas.width); bottom = Math.max(bottom, y); top = Math.min(top, y); }
  return [bottom, top];
}

// 四足キャラの 1 枚絵から歩行・待機・ジャンプ・攻撃のコマをドット単位で生成する
// recolor: { map: { "#元色": "#新色" }, px: [[x, y, "#色"], ...] } で色違いを作る
export function buildSpriteFrames(img, recolor = null) {
  const W = img.width, Hh = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = Hh;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, Hh).data;
  if (recolor) {
    const map = new Map(Object.entries(recolor.map || {}).map(([a, b]) => [toHex(a), toHex(b)]));
    const set = (i, c) => { c = toHex(c); d[i] = c >> 16; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; };
    for (let i = 0; i < d.length; i += 4) { const c = map.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); if (c !== undefined) set(i, c); }
    for (const [x, y, c] of recolor.px || []) set((y * W + x) * 4, c);
  }
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const bg = px(0, 0); // 角のピクセル色を背景として抜く
  const solid = (x, y) => { const p = px(x, y); return p[3] >= 128 && !(bg[3] >= 128 && p[0] === bg[0] && p[1] === bg[1] && p[2] === bg[2]); };
  let bottom = 0;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (solid(x, y)) bottom = y;
  const centers = [];
  for (let x = 0; x < W; x++) if (solid(x, bottom) && !(x > 0 && solid(x - 1, bottom))) centers.push(x);
  const legOf = (x) => { let best = 0; centers.forEach((cx, i) => { if (Math.abs(cx - x) < Math.abs(centers[best] - x)) best = i; }); return best; };
  const isTail = (x, y) => x >= W * 0.75 && y <= Hh * 0.35;

  const makeFrame = (legShift, tailShift = 0) => {
    const fc = document.createElement('canvas'); fc.width = W; fc.height = Hh;
    const fg = fc.getContext('2d'); const out = fg.createImageData(W, Hh);
    const put = (x, y, p) => { if (x < 0 || x >= W) return; const i = (y * W + x) * 4; out.data.set([p[0], p[1], p[2], 255], i); };
    const layers = [[], [], []];
    for (let y = 0; y <= bottom; y++) for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      if (y >= bottom - 1 && centers.length) layers[1].push([x + (legShift[legOf(x)] || 0), y, px(x, y)]);
      else if (isTail(x, y)) layers[2].push([x + tailShift, y, px(x, y)]);
      else layers[0].push([x, y, px(x, y)]);
    }
    for (const L of layers) for (const [x, y, p] of L) put(x, y, p);
    fg.putImageData(out, 0, 0);
    return nearestTex(fc);
  };
  const n = centers.length, A = centers.map((_, i) => (i === 0 || i === n - 1) ? -1 : 1);
  const frames = {
    idle: [makeFrame([]), makeFrame([], 1)],
    walk: [makeFrame(A), makeFrame([]), makeFrame(A.map(v => -v)), makeFrame([])],
    jump: makeFrame(centers.map((_, i) => i < n / 2 ? -1 : 1)),
    attack: makeFrame(centers.map((_, i) => i < n / 2 ? -2 : 1)),   // 前足を突き出す
  };
  return { frames, geo: spriteGeo(W, Hh, bottom), height: (bottom + 1) * PIX };
}

// 背景色（角のピクセル）を抜いたドット絵テクスチャ
export function cutoutTex(img) {
  const W = img.width, H = img.height, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, W, H), d = id.data, [br, bg, bb, ba] = d;
  let bottom = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (ba >= 128 && d[i] === br && d[i + 1] === bg && d[i + 2] === bb) d[i + 3] = 0;
    if (d[i + 3] >= 128) bottom = Math.max(bottom, Math.floor(i / 4 / W));
  }
  g.putImageData(id, 0, 0);
  return { tex: nearestTex(c), W, H, bottom };
}

// data/characters.json の sprite 定義から { frames: { idle: [...], ... }, geo } を作る
//   type "cat"    : 1 枚絵から歩行などのコマを自動生成（recolor で色違い）
//   type "frames"   : 用意したコマ画像を順番に再生（srcs）
//   type "aseprite" : .aseprite をそのまま読む。タグ idle / walk をそれぞれのアニメに使う
//                     height で見た目の背の高さ（ワールド単位）を指定（省略時はほかのキャラと同じドットの大きさ）
// 戻り値の rate は idle の 1 秒あたりのコマ数、height は絵の背の高さ（吹き出しの位置などに使う）
export async function loadCharacterSprite(sprite) {
  if (sprite.type === 'aseprite') {
    const ase = await loadAseprite(sprite.src);
    const tag = (name) => { const t = ase.tags.find(t => t.name === name); return t ? ase.frames.slice(t.from, t.to + 1) : null; };
    const idle = tag('idle') || ase.frames.slice(0, 1), walk = tag('walk') || idle;
    const [bottom, top] = bottomRow(idle[0].canvas);
    const drawn = bottom - top + 1;
    const scale = sprite.height ? sprite.height / (drawn * PIX) : 1;
    const tex = (f) => nearestTex(f.canvas);
    const idleT = idle.map(tex), walkT = walk.map(tex);
    const avg = idle.reduce((a, f) => a + (f.duration || 100), 0) / idle.length;
    return {
      frames: { idle: idleT, walk: walkT, jump: walkT[0], attack: idleT[0] },
      geo: spriteGeo(ase.width, ase.height, bottom, scale),
      rate: 1000 / avg, height: drawn * PIX * scale,
    };
  }
  if (sprite.type === 'frames') {
    const imgs = await Promise.all(sprite.srcs.map(loadImg));
    const cs = imgs.map(cutoutTex), { W, H, bottom } = cs[0];
    return { frames: { idle: cs.map(c => c.tex) }, geo: spriteGeo(W, H, bottom), height: (bottom + 1) * PIX };
  }
  return buildSpriteFrames(await loadImg(sprite.src), sprite.recolor || null);
}

// キャラクター共通のスプライトマテリアル（周りの光を受ける）
export const spriteMaterial = () => new THREE.MeshLambertMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.3 });
