// ねこパンチ（J / F）。今の段階（tier）までの物を壊せる。それより大きい物は「カキン！」とはじかれる
// 2 段階以上小さい物は、歩いてぶつかるだけでつぶれる
import * as THREE from 'three';
import { boxGeo } from './core/geometry.js';
import { pixTex } from './core/textures.js';
import { onAction } from './core/input.js';
import { sfx } from './core/audio.js';
import { R } from './core/random.js';
import { rectDist } from './collision.js';
import { unlockLevel } from './config.js';

const REACH = 0.62;        // scale 1 での攻撃が届く距離（キャラ中心から当たり判定の縁まで）
const AIM = 1.0;           // この距離にある物へ自動で向き直る
const DEBRIS_MAX = 520;

const starTex = pixTex(16, (g) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = Math.abs(x + 0.5 - 8), dy = Math.abs(y + 0.5 - 8);
    if (dx * dy < 2.2 && dx + dy < 8.5) { g.fillStyle = dx + dy < 3 ? '#ffffff' : '#ffd75e'; g.fillRect(x, y, 1, 1); }
  }
});
const sparkTex = pixTex(16, (g) => {
  g.fillStyle = '#cfe8ff';
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; for (let r = 2; r < 7.5; r++) g.fillRect(Math.round(8 + Math.cos(a) * r - 0.5), Math.round(8 + Math.sin(a) * r - 0.5), 1, 1); }
});

export class Combat {
  constructor(game) {
    this.game = game;
    this.queued = false; this.cd = 0; this.hit = false;
    onAction('attack', () => { this.queued = true; });
    const mk = (map) => Array.from({ length: 10 }, () => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, alphaTest: 0.5, toneMapped: false, depthTest: false }));
      sp.visible = false; sp.userData.life = 0; sp.renderOrder = 10; game.scene.add(sp); return sp;
    });
    this.stars = mk(starTex).concat(mk(sparkTex)); this.starIdx = 0;
    this.debris = []; this.debrisIdx = 0;
    this._bb = new THREE.Box3(); this._v = new THREE.Vector3(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }

  get list() { return this.game.mall.list; }

  popStar(x, y, z, size, spark = false) {
    const pool = this.stars, base = spark ? 10 : 0;
    const sp = pool[base + (this.starIdx++ % 10)];
    sp.position.set(x, y, z); sp.visible = true; sp.userData.life = 0; sp.userData.size = size; sp.material.rotation = R(0, 1.5);
  }

  spawnDebris(mat, pos, size, vel) {
    let d;
    if (this.debris.length < DEBRIS_MAX) {
      d = new THREE.Mesh(boxGeo, mat); d.userData = { v: new THREE.Vector3(), w: new THREE.Vector3(), s: new THREE.Vector3(), life: 0, rest: false, g: 9.8 };
      d.castShadow = true; this.game.scene.add(d); this.debris.push(d);
    } else d = this.debris[this.debrisIdx++ % DEBRIS_MAX];
    const u = d.userData;
    d.material = mat; d.visible = true;
    d.position.copy(pos); u.s.copy(size); d.scale.copy(size);
    d.rotation.set(R(0, 6), R(0, 6), R(0, 6));
    u.v.copy(vel); u.w.set(R(-12, 12), R(-12, 12), R(-12, 12)); u.life = 0; u.rest = false;
    u.g = 9.8 * Math.sqrt(Math.max(1, Math.max(size.x, size.y, size.z) / 0.3));   // 大きいがれきほど速く落ちる（スローに見えないように）
  }

  // ねこの反対側へはじけ飛ぶ速度
  burstVel(out, px, pz, power) {
    const h = this.game.hero.position;
    let dx = px - h.x, dz = pz - h.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    return out.set(dx * R(0.6, 2.6) * power + R(-0.8, 0.8) * power, R(1.5, 3.8) * power, dz * R(0.6, 2.6) * power + R(-0.8, 0.8) * power);
  }

  // 壊す。how: 'punch' | 'crush' | 'collapse'
  shatter(b, how = 'punch') {
    const { impact } = this.game, bb = this._bb;
    b.broken = true; b.g.updateMatrixWorld(true);
    if (b.mats) for (const m of b.mats) m.opacity = m.userData.baseOpacity;
    // 合体前の部品ごとに破片を出す（箱をいまの位置・向きに直して使う）
    const parts = [], faded = new Map();
    if (b.mats) b.g.traverse(o => { if (o.isMesh && !o.material.isShaderMaterial) faded.set(o.userData.srcMat, o.material); });
    for (const [mat, box] of b.parts) {
      bb.copy(box).applyMatrix4(b.g.matrixWorld);
      parts.push([faded.get(mat) || mat, bb.getSize(new THREE.Vector3()), bb.min.clone(), bb.max.clone()]);
    }
    b.g.visible = false;
    const power = Math.sqrt(Math.max(1, b.h)) * (how === 'crush' ? 0.6 : 1);
    const budget = how === 'crush' ? 2 : b.tier === 1 ? 4 : b.tier >= 5 ? 10 : 7;
    for (const [mat, sz, mn, mx] of parts) {
      const vol = Math.max(sz.x, 0.02) * Math.max(sz.y, 0.02) * Math.max(sz.z, 0.02);
      const n = THREE.MathUtils.clamp(Math.round(vol / Math.pow(b.h * 0.12 + 0.01, 3) * 0.4), 1, budget), k = 1 / Math.cbrt(n);
      for (let i = 0; i < n; i++) {
        this._p.set(R(mn.x, mx.x), R(mn.y, mx.y), R(mn.z, mx.z));
        this._s.set(Math.max(sz.x * k * R(0.45, 0.9), 0.015), Math.max(sz.y * k * R(0.45, 0.9), 0.015), Math.max(sz.z * k * R(0.45, 0.9), 0.015));
        this.spawnDebris(mat, this._p, this._s, this.burstVel(this._v, this._p.x, this._p.z, power));
      }
    }
    // 上に載っていた物は落ちる
    for (const r of b.riders) if (!r.broken) { r.falling = true; r.support = null; }
    const [x0, x1, z0, z1] = b.rect, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (how !== 'crush') {
      this.popStar(cx, b.y + b.h * 0.5, cz, Math.max(0.6, b.h * 0.5));
      impact.hitStop = Math.max(impact.hitStop, 0.05 + b.tier * 0.015); impact.shake = Math.max(impact.shake, 0.15 + b.tier * 0.08);
      sfx('break', b.tier);
    } else sfx('crush');
    this.game.onBreak(b, how);
  }

  update(dt, t) {
    const { game } = this, { hero, impact } = game;
    const tier = game.tier, s = hero.scale, hp = hero.position;
    this.cd -= dt;
    // 攻撃開始：近くに壊せる物があればそちらを向く
    if (this.queued && this.cd <= 0 && hero.frames && !game.inputLocked) {
      this.cd = 0.3; this.hit = false;
      let best = null, bd = AIM * s;
      for (const b of this.list) {
        if (b.broken || b.hidden || b.tier > tier || !this.inHeight(b)) continue;
        const [d, cx, cz] = rectDist(hp.x, hp.z, b.rect);
        if (d < bd) { bd = d; best = [cx, cz]; }
      }
      if (best) {
        const dx = best[0] - hp.x, dz = best[1] - hp.z, l = Math.hypot(dx, dz);
        if (l > 1e-3) { hero.dir.set(dx / l, 0, dz / l); hero.faceToward(best[0], best[1]); }
      }
      hero.startAttack(); sfx('swing');
    }
    this.queued = false;

    if (hero.attacking && !this.hit && hero.attack.t >= 0.06) {
      this.hit = true;
      game.shoppers?.scare(hp, 3 * s);
      const reach = REACH * s, power = 1 + Math.max(0, game.level - 1) * 0.7;
      let locked = null, ld = Infinity, any = false;
      for (const b of this.list) {
        if (b.broken || b.hidden || !this.inHeight(b)) continue;
        const [d, cx, cz] = rectDist(hp.x, hp.z, b.rect);
        if (d > reach) continue;
        // 背中側は当たらない
        const dx = cx - hp.x, dz = cz - hp.z, l = Math.hypot(dx, dz);
        if (l > hero.radius * 0.6 && (dx * hero.dir.x + dz * hero.dir.z) / l < -0.25) continue;
        if (b.tier > tier) { if (d < ld) { ld = d; locked = [b, cx, cz]; } continue; }
        any = true;
        b.hp -= power * (1 + Math.max(0, game.level - unlockLevel(b.tier)));
        if (b.hp <= 0) { this.shatter(b); continue; }
        b.shake = 0.3; impact.hitStop = Math.max(impact.hitStop, 0.04); impact.shake = Math.max(impact.shake, 0.1 + b.tier * 0.04); sfx('hit');
        this.popStar(cx, Math.max(b.y + 0.1, hp.y + hero.height * 0.5), cz, 0.35 * Math.sqrt(s) + 0.1);
        const mesh = b.g.children.find(o => o.isMesh && !o.material.isShaderMaterial);
        if (mesh) for (let i = 0; i < 3; i++) this.spawnDebris(mesh.material, this._p.set(cx, hp.y + hero.height * R(0.3, 0.8), cz), this._s.setScalar(R(0.02, 0.05) * s), this.burstVel(this._v, cx, cz, 0.6 * Math.sqrt(s)));
      }
      // 大きすぎる物を叩いた：はじかれる
      if (locked && !any) {
        const [b, cx, cz] = locked;
        b.shake = 0.15; hero.bump = 0.12; impact.shake = Math.max(impact.shake, 0.08);
        sfx('clank');
        this.popStar(cx, hp.y + hero.height * 0.55, cz, 0.3 * Math.sqrt(s) + 0.1, true);
        game.onLocked(b, cx, cz);
      }
    }

    // 歩いてぶつかった小さい物はつぶれる
    const crushTier = game.crushTier, rr = hero.radius * 1.05;
    if (crushTier > 0) for (const b of this.list) {
      if (b.broken || b.hidden || b.tier > crushTier || b.y > hp.y + hero.height * 0.8) continue;
      if (rectDist(hp.x, hp.z, b.rect)[0] < rr) this.shatter(b, 'crush');
    }

    // 叩かれた物の揺れ、支えを失った物の落下
    for (const b of this.list) {
      if (b.broken) continue;
      if (b.falling) {
        b.vy -= 9.8 * Math.sqrt(Math.max(1, b.h)) * dt; b.y += b.vy * dt;
        if (b.y <= 0) { b.y = 0; b.vy = 0; b.falling = false; b.hitY = 0; b.g.rotation.z = R(-0.3, 0.3); if (b.tier >= 2) b.solid = true; }
        b.g.position.y = b.y;
      }
      if (b.shake > 0) {
        b.shake = Math.max(0, b.shake - dt); const k = b.shake / 0.3, a = Math.min(0.06, 0.03 * b.h);
        b.g.position.x = b.x + (Math.random() * 2 - 1) * a * k; b.g.position.z = b.z + (Math.random() * 2 - 1) * a * 0.6 * k;
        b.g.scale.set(b.sc * (1 + 0.05 * k), b.sc * (1 - 0.06 * k), b.sc * (1 + 0.05 * k));
        if (b.shake === 0) { b.g.position.x = b.x; b.g.position.z = b.z; b.g.scale.setScalar(b.sc); }
      }
    }

    // 破片の物理（跳ねて転がり、しばらくすると消える）
    for (const d of this.debris) {
      if (!d.visible) continue;
      const u = d.userData; u.life += dt;
      if (!u.rest && game.inSpace) {   // 宇宙：重さがないので、ゆっくり回りながら漂う
        d.position.addScaledVector(u.v, dt); u.v.multiplyScalar(1 - dt * 0.4);
        d.rotation.x += u.w.x * dt * 0.3; d.rotation.y += u.w.y * dt * 0.3;
      } else if (!u.rest) {
        u.v.y -= u.g * dt; d.position.addScaledVector(u.v, dt);
        d.rotation.x += u.w.x * dt; d.rotation.y += u.w.y * dt; d.rotation.z += u.w.z * dt;
        const fy = Math.min(u.s.x, u.s.y, u.s.z) * 0.5;
        if (d.position.y < fy) {
          d.position.y = fy;
          u.v.y *= -0.3; u.v.x *= 0.6; u.v.z *= 0.6; u.w.multiplyScalar(0.55);
          if (Math.abs(u.v.y) < 0.6 && u.v.x * u.v.x + u.v.z * u.v.z < 0.08) {   // 寝かせて止める
            u.rest = true; d.rotation.set(0, d.rotation.y, 0); d.position.y = u.s.y * 0.5;
          }
        }
      }
      if (u.life > 7) { const k = 1 - (u.life - 7) / 0.6; if (k <= 0) d.visible = false; else d.scale.copy(u.s).multiplyScalar(k); }
    }

    for (const sp of this.stars) {
      if (!sp.visible) continue;
      sp.userData.life += dt; const k = sp.userData.life / 0.2;
      if (k >= 1) { sp.visible = false; continue; }
      sp.scale.setScalar(sp.userData.size * (0.5 + k * 0.8));
    }
  }

  // 高い所の物は、ジャンプしないと届かない
  inHeight(b) {
    const h = this.game.hero;
    return b.hitY <= h.position.y + h.height * 1.7 && b.y + b.h >= h.position.y - 0.05;
  }
}
