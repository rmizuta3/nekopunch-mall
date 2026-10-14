// 主人公の黒ねこ（cat.aseprite）。WASD / 矢印で移動、Shift で走る、Space でジャンプ
// ドット絵の板を常にカメラへ向ける（Y 軸ビルボード）。レベルが上がると group ごと大きくなる
import * as THREE from 'three';
import { PIX } from './config.js';
import { isDown } from './core/input.js';
import { cg } from './core/geometry.js';
import { steamTex, pixTex } from './core/textures.js';
import { loadAseprite } from './core/aseprite.js';
import { buildSpriteFrames, nearestTex, spriteMaterial } from './core/sprites.js';

export const RADIUS = 0.24;        // scale 1 のときの当たり判定の半径
export const HEIGHT = 16 * PIX;    // scale 1 のときの背の高さ
const ATTACK_LEN = 0.26;

// ねこパンチの弧（元絵は左向きなので左側に描く。スプライトの反転で向きも変わる）
const slashTex = [[-1.7, -0.5], [-1.7, 1.1], [0.1, 1.7]].map(([a0, a1]) => pixTex(24, (g) => {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const dx = x + 0.5 - 15, dy = y + 0.5 - 12, r = Math.hypot(dx, dy), th = Math.atan2(dy, -dx);
    if (th < a0 || th > a1) continue;
    const w = 3.2 * (1 - Math.abs(th) / 1.8) + 0.6;
    if (r > 10 || r < 10 - w) continue;
    g.fillStyle = r > 9 ? '#ffffff' : '#ffe9a8'; g.fillRect(x, y, 1, 1);
  }
}));
// 肉球（パンチの瞬間に出る）
const pawTex = pixTex(16, (g) => {
  g.fillStyle = '#ffb8c8';
  const dot = (cx, cy, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r) g.fillRect(x, y, 1, 1); };
  dot(8, 10.5, 3.6); dot(3.5, 5.5, 1.8); dot(6.5, 3.2, 1.8); dot(9.5, 3.2, 1.8); dot(12.5, 5.5, 1.8);
});

export class Hero {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group(); game.scene.add(this.group);
    this.position = this.group.position;
    this.phase = 0; this.speed = 0; this.vy = 0; this.grounded = true;
    this.scale = 1;
    this.face = 1;        // 1: 左向き（元絵の向き）、-1: 右向き
    this.dir = new THREE.Vector3(0, 0, -1);
    this.frames = null;
    this.attack = { t: -1 };
    this.bump = 0;        // かたい物を叩いた時のはね返り

    this.bb = new THREE.Group(); this.group.add(this.bb);
    this.spr = new THREE.Group(); this.bb.add(this.spr);
    this.mat = spriteMaterial();
    const blob = new THREE.Mesh(cg('pl', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: steamTex, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; blob.scale.set(0.75, 0.4, 1); this.group.add(blob);

    this.slashMat = new THREE.MeshBasicMaterial({ map: slashTex[0], transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    this.slash = new THREE.Mesh(cg('pl', () => new THREE.PlaneGeometry(1, 1)), this.slashMat);
    this.slash.scale.set(24 * PIX, 24 * PIX, 1); this.slash.position.set(-0.3, 0.3, 0.02); this.slash.visible = false;
    this.spr.add(this.slash);
    this.pawMat = new THREE.MeshBasicMaterial({ map: pawTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    this.paw = new THREE.Mesh(cg('pl', () => new THREE.PlaneGeometry(1, 1)), this.pawMat);
    this.paw.scale.setScalar(0.22); this.paw.position.set(-0.42, 0.26, 0.04); this.paw.visible = false;
    this.spr.add(this.paw);
    this._mv = new THREE.Vector3();
  }

  async load(src) {
    const ase = await loadAseprite(src);
    // 歩き・ジャンプ・パンチのコマは 1 コマ目から自動生成、待機は aseprite の 2 コマをそのまま
    const gen = buildSpriteFrames(ase.frames[0].canvas);
    this.frames = { ...gen.frames, idle: ase.frames.map(f => nearestTex(f.canvas)) };
    this.idleRate = 1000 / (ase.frames[0].duration || 500);
    this.spr.add(new THREE.Mesh(gen.geo, this.mat));
    this.mat.map = this.mat.emissiveMap = this.frames.idle[0]; this.mat.needsUpdate = true;
  }

  get radius() { return RADIUS * this.scale; }
  get height() { return HEIGHT * this.scale; }
  get attacking() { return this.attack.t >= 0; }
  place(x, z) { this.position.set(x, 0, z); this.vy = 0; this.speed = 0; this.attack.t = -1; }
  startAttack() { this.attack.t = 0; }
  setScale(s) { this.scale = s; this.group.scale.setScalar(s); }
  // 画面上で相手が右にいるか左にいるかで向きを変える
  faceToward(x, z) {
    const f = this.game.camFwd;
    const sx = (x - this.position.x) * -f.z + (z - this.position.z) * f.x;
    if (Math.abs(sx) > 0.05 * this.scale) this.face = sx > 0 ? -1 : 1;
  }

  update(dt, t) {
    const { game } = this, p = this.position, fwd = game.camFwd, mat = this.mat, s = this.scale;
    const key = (a) => !game.inputLocked && isDown(a);
    const ix = (key('right') ? 1 : 0) - (key('left') ? 1 : 0);
    const iz = (key('up') ? 1 : 0) - (key('down') ? 1 : 0);
    const mv = this._mv.set(fwd.x * iz - fwd.z * ix, 0, fwd.z * iz + fwd.x * ix);
    const moving = mv.lengthSq() > 0;
    const k = s;   // 大きさに比例して速く歩く（どのレベルでも「体の何倍ぶん進むか」が同じ。遅く感じないように）
    this.speed = THREE.MathUtils.damp(this.speed, moving ? (key('run') ? 3.6 : 1.7) * k : 0, 10, dt);
    if (moving) this.dir.copy(mv.normalize());
    if (this.speed > 0.01 * k) {
      p.x += this.dir.x * this.speed * dt; p.z += this.dir.z * this.speed * dt;
      game.collision.resolve(p, this.radius);
    }
    // パンチの踏み込み / はね返り
    if (this.attacking) {
      this.attack.t += dt;
      if (this.attack.t < 0.1) { p.addScaledVector(this.dir, 1.6 * k * dt * (1 - this.attack.t / 0.1)); game.collision.resolve(p, this.radius); }
    }
    if (this.bump > 0) { p.addScaledVector(this.dir, -this.bump * 6 * k * dt); this.bump = Math.max(0, this.bump - dt); game.collision.resolve(p, this.radius); }

    // ジャンプ
    if (key('jump') && this.grounded) this.vy = 3.6 * Math.sqrt(s);
    this.vy -= 9.8 * Math.pow(s, 0.25) * dt; p.y += this.vy * dt;
    if (p.y <= 0) { p.y = 0; this.vy = 0; }
    this.grounded = p.y <= 0.001;

    // スプライト（コマ送り + ドット単位の上下動）
    const amt = Math.min(1, this.speed / (1.7 * k));
    const runAmt = THREE.MathUtils.clamp((this.speed / k - 1.7) / 1.9, 0, 1);
    const cam = game.camera.position;
    this.bb.rotation.y = Math.atan2(cam.x - p.x, cam.z - p.z);
    if (moving) {
      const sx = this.dir.x * -fwd.z + this.dir.z * fwd.x;   // 画面上の左右成分
      if (sx > 0.15) this.face = -1; else if (sx < -0.15) this.face = 1;
    }
    this.spr.scale.x = this.face;
    let walkIdx = -1;
    if (amt > 0.15) { this.phase += dt * (5 + this.speed / k * 3.4); walkIdx = Math.floor(this.phase) % 4; }
    // 足音（2 コマに 1 回）
    if (walkIdx >= 0 && walkIdx !== this.lastWalk && walkIdx % 2 === 0 && this.grounded) game.onStep?.();
    this.lastWalk = walkIdx;
    if (this.frames) {
      const F = this.frames;
      const tex = !this.grounded ? F.jump : walkIdx >= 0 ? F.walk[walkIdx] : F.idle[Math.floor(t * this.idleRate) % F.idle.length];
      if (mat.map !== tex) mat.map = mat.emissiveMap = tex;
    }
    const bob = walkIdx >= 0 && walkIdx % 2 ? PIX * (runAmt > 0.4 ? 2 : 1) : 0;
    this.spr.position.set(0, bob, 0);
    this.spr.rotation.z = THREE.MathUtils.damp(this.spr.rotation.z, 0.09 * runAmt * this.face + (!this.grounded ? 0.12 * this.face : 0), 12, dt);
    // ねこパンチ：前足を出したコマ + 踏み込み + 弧 + 肉球
    this.slash.visible = false; this.paw.visible = false;
    if (this.attacking && this.frames) {
      const q = this.attack.t / ATTACK_LEN;
      mat.map = mat.emissiveMap = this.frames.attack;
      this.spr.position.x = -this.face * PIX * Math.round(3 * Math.sin(Math.min(1, q * 1.6) * Math.PI));
      this.spr.rotation.z = 0.22 * this.face * Math.sin(Math.min(1, q * 1.4) * Math.PI);
      const f = Math.floor(this.attack.t / 0.045);
      if (f >= 1 && f <= 3) { this.slash.visible = true; this.slashMat.map = slashTex[f - 1]; }
      if (f >= 1 && f <= 2) { this.paw.visible = true; this.paw.scale.setScalar(0.18 + f * 0.05); }
    }
    if (this.attack.t > ATTACK_LEN) this.attack.t = -1;
  }
}
