// モールのお客さん（ほかのねこたち）。ぶらぶら歩き、近くでパンチすると逃げる。壊せない（鳴き声はなし）
// 絵は主人公と同じ cat.aseprite の色違い（黒い体の色だけ塗りかえる）
import * as THREE from 'three';
import { nearestTex, spriteMaterial } from './core/sprites.js';
import { loadAseprite } from './core/aseprite.js';
import { PIX } from './config.js';
import { R } from './core/random.js';

const COLORS = ['#f4f0e8', '#e8a050', '#9aa0aa', '#c8a07a', '#5a5f6a'];   // 白・茶トラ・グレー・ミルクティー・こげ茶
const RADIUS = 0.2;

// 暗い画素（体）だけを別の色にした絵を作る。元の絵は左向き
function recolor(canvas, hex) {
  const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
  const g = c.getContext('2d'); g.drawImage(canvas, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data, v = parseInt(hex.slice(1), 16);
  const [r, gg, b] = [v >> 16, (v >> 8) & 255, v & 255];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const lum = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    if (lum < 70) { const k = 0.85 + lum / 70 * 0.3; d[i] = Math.min(255, r * k); d[i + 1] = Math.min(255, gg * k); d[i + 2] = Math.min(255, b * k); }
  }
  g.putImageData(img, 0, 0); return c;
}
function bottomRow(canvas) {
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; let bottom = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] >= 128) bottom = Math.max(bottom, Math.floor(i / 4 / canvas.width));
  return bottom;
}

export class Shoppers {
  constructor(game) { this.game = game; this.list = []; }

  async spawn(n, spots) {
    const ase = await loadAseprite('assets/images/cat.aseprite');
    const W = ase.width, H = ase.height, bottom = bottomRow(ase.frames[0].canvas);
    const geo = new THREE.PlaneGeometry(W * PIX, H * PIX); geo.translate(0, H * PIX / 2 - (H - 1 - bottom) * PIX, 0);
    const kinds = COLORS.map(col => ({ flip: true, geo, tex: ase.frames.map(f => nearestTex(recolor(f.canvas, col))) }));
    for (let i = 0; i < n; i++) {
      const k = kinds[i % kinds.length], [x, z] = spots[i % spots.length];
      const g = new THREE.Group(), bb = new THREE.Group(), mat = spriteMaterial();
      mat.map = mat.emissiveMap = k.tex[0];
      const spr = new THREE.Mesh(k.geo, mat); bb.add(spr); g.add(bb);
      g.position.set(x + R(-1, 1), 0, z + R(-1, 1));
      this.game.scene.add(g);
      this.list.push({ k, g, bb, spr, mat, dir: new THREE.Vector3(R(-1, 1), 0, R(-1, 1)).normalize(), speed: 0, wait: R(0, 3), panic: 0, hop: 0, ph: R(0, 10) });
    }
  }

  // パンチの近くにいたら逃げる
  scare(p, r) {
    for (const c of this.list) {
      const dx = c.g.position.x - p.x, dz = c.g.position.z - p.z, d = Math.hypot(dx, dz);
      if (d > r) continue;
      c.panic = 2.5; c.hop = 0.3; c.dir.set(dx / (d || 1), 0, dz / (d || 1));
    }
  }

  update(dt, t) {
    const { game } = this, cam = game.camera.position, hp = game.hero.position, fwd = game.camFwd;
    for (const c of this.list) {
      const p = c.g.position;
      // 大きいねこが近づくと逃げる
      const dx = p.x - hp.x, dz = p.z - hp.z, d = Math.hypot(dx, dz);
      if (d < game.hero.radius + 1.2 && c.panic <= 0) { c.panic = 1.5; c.dir.set(dx / (d || 1), 0, dz / (d || 1)); }
      let target = 0;
      if (c.panic > 0) { c.panic -= dt; target = 3.2; }
      else {
        c.wait -= dt;
        if (c.wait <= 0) {
          if (c.speed < 0.1) { c.dir.set(R(-1, 1), 0, R(-1, 1)).normalize(); c.wait = R(1.5, 4); c.walking = true; }
          else { c.wait = R(1, 3); c.walking = false; }
        }
        target = c.walking ? 0.8 : 0;
      }
      c.speed = THREE.MathUtils.damp(c.speed, target, 6, dt);
      const ox = p.x, oz = p.z;
      p.x += c.dir.x * c.speed * dt; p.z += c.dir.z * c.speed * dt;
      game.collision.resolve(p, RADIUS);
      if (c.speed > 0.2 && Math.hypot(p.x - ox, p.z - oz) < c.speed * dt * 0.3) { c.dir.set(R(-1, 1), 0, R(-1, 1)).normalize(); }   // 引っかかったら向きを変える
      c.hop = Math.max(0, c.hop - dt);
      p.y = c.hop > 0 ? Math.sin(c.hop / 0.3 * Math.PI) * 0.25 : 0;
      c.bb.rotation.y = Math.atan2(cam.x - p.x, cam.z - p.z);
      const sx = c.dir.x * -fwd.z + c.dir.z * fwd.x;
      if (c.speed > 0.1 && Math.abs(sx) > 0.1) c.spr.scale.x = (sx > 0 ? -1 : 1) * (c.k.flip ? 1 : -1);
      c.ph += dt * (c.speed > 0.2 ? 6 + c.speed * 3 : 1.5);
      const tex = c.k.tex[Math.floor(c.ph) % c.k.tex.length];
      if (c.mat.map !== tex) c.mat.map = c.mat.emissiveMap = tex;
    }
  }
}
