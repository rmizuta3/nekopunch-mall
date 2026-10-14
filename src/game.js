// ゲーム本体：モール・ねこ・パンチ・成長・HUD をつなぐ
import * as THREE from 'three';
import { GROW, TIERS, MAX_TIER, AREAS, SPACE_LEVEL, QUALITY, QUALITY_ORDER, unlockLevel, tierOfLevel } from './config.js';
import { createEngine } from './core/engine.js';
import { onAction } from './core/input.js';
import { sfx, unlockAudio, loadSounds, Music, setMuted, isMuted, step } from './core/audio.js';
import { toon } from './core/materials.js';
import { reseed, R } from './core/random.js';
import { Collision } from './collision.js';
import { buildMall, BOUNDS, START_POS, ROOM, MALL } from './mall.js';
import { Hero } from './hero.js';
import { Combat } from './combat.js';
import { Shoppers } from './shoppers.js';
import { Hud, fmtYen } from './hud.js';
import { SPACE, SPACE_BOUNDS } from './space.js';
import { Zukan } from './zukan.js';


export class Game {
  constructor() {
    this.engine = createEngine();
    this.scene = this.engine.scene; this.camera = this.engine.camera; this.controls = this.engine.controls;
    this.engine.fx.bloom.strength = 0.32; this.engine.fx.bloom.threshold = 0.9;
    this.collision = new Collision();
    this.impact = { hitStop: 0, shake: 0 };
    this.camFwd = new THREE.Vector3(0, 0, -1);
    this.clock = new THREE.Clock();
    this.state = 'title';   // title → play（→ launch → play）→ collapse → result
    this.hero = new Hero(this);
    this.combat = new Combat(this);
    this.shoppers = new Shoppers(this);
    this.hud = new Hud(this);
    this.level = 1; this.xp = 0; this.yen = 0; this.broken = 0; this.playTime = 0;
    this.combo = 0; this.lastBreak = -9; this.lockMsgAt = -9;
    this.zoom = 1; this.camDist = 6;
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._v = new THREE.Vector3();

    addEventListener('wheel', (e) => { this.zoom = THREE.MathUtils.clamp(this.zoom * Math.exp(e.deltaY * 0.001), 0.55, 1.8); }, { passive: true });
    const start = () => { if (this.state === 'title' && !this.zukan?.isOpen) this.begin(); };
    onAction('start', start); onAction('attack', start);
    addEventListener('pointerdown', (e) => { if (this.state === 'title' && !this.zukan?.isOpen && e.target.closest('#title')) this.begin(); });
    // 図鑑（G で開く・閉じる、Esc で閉じる）。プレイ中に開くとゲームは止まる
    const openZukan = () => {
      if (!this.zukan || !['title', 'play', 'zukan', 'result'].includes(this.state)) return;
      if (this.zukan.isOpen) { this.zukan.close(); if (this.state === 'zukan') this.state = 'play'; }
      else { this.zukan.open(); if (this.state === 'play') this.state = 'zukan'; }
    };
    onAction('zukan', openZukan);
    onAction('quality', () => {
      const next = QUALITY_ORDER[(QUALITY_ORDER.indexOf(this.quality) + 1) % QUALITY_ORDER.length];
      this.setQuality(next); this.hud.toast(`画質：${QUALITY[next].label}`, 'P で切りかえ');
    });
    onAction('back', () => { if (this.zukan?.isOpen) openZukan(); });
    document.querySelector('#zukan .close').addEventListener('click', () => { if (this.state === 'zukan') this.state = 'play'; });
    onAction('restart', () => { if (this.state === 'result') location.reload(); });
    onAction('mute', () => { setMuted(!isMuted()); if (this.state !== 'title') this.hud.toast(isMuted() ? 'サウンド OFF' : 'サウンド ON', 'M で切りかえ'); });
    // BGM（OpenGameArt の CC0 曲）：部屋とモール → 街 → 超高層ビル街
    this.music = new Music({ dream: 'assets/audio/bgm/dream.ogg', arplands: 'assets/audio/bgm/arplands.ogg', boss: 'assets/audio/bgm/boss.ogg', space: 'assets/audio/bgm/space.ogg' });
    this.flash = document.getElementById('flash');
  }

  get inputLocked() { return this.state !== 'play'; }
  get inSpace() { return this.mall?.inSpace; }
  get tier() { return tierOfLevel(this.level); }
  // これ以下の段階の物は、歩くだけでつぶれる
  get crushTier() { const T = this.tier; return T >= 2 ? Math.max(1, T - 2) : 0; }

  async init() {
    reseed();
    this.mall = buildMall(this.scene);
    this.scene.add(this.mall.root);
    this.collision.reset(BOUNDS);
    this.collision.addProvider(() => {
      const ct = this.crushTier, out = [];
      for (const b of this.mall.list) if (b.solid && !b.broken && !b.hidden && b.tier > ct) out.push(b.rect);
      return out;
    });
    // レベルアップに必要な XP：段階 t の合計は「段階 t のときに行ける場所」にある物だけで数える
    // （ねこ部屋の中だけで Lv.4 まで上がり、モールの中だけで Lv.8 まで上がれる）
    const sum = {};
    for (let t = 1; t <= MAX_TIER; t++) sum[t] = this.mall.list.reduce((a, b) => a + (b.tier === t && AREAS[b.area] <= t ? b.xp : 0), 0);
    this.totalCount = this.mall.list.length;
    this.req = [0];
    for (let L = 1; L < GROW.maxLevel; L++) this.req[L] = this.req[L - 1] + Math.max(1, Math.round(sum[tierOfLevel(L)] * GROW.share));
    this.req[GROW.maxLevel] = Infinity;
    this.finals = this.mall.list.filter(b => b.tier === MAX_TIER);
    // 宇宙の物は、そのレベルになるまで出てこない（着いてすぐの所をすっきりさせる）
    for (const b of this.mall.list) if (b.area === 'space') b.hidden = b.tier > SPACE_LEVEL;

    // 効果音（Kenney などの CC0 素材。assets/audio/CREDITS.md）
    const SE = ['hit', 'hit_heavy', 'glass_l', 'tin', 'plate_l', 'wood_m', 'plank', 'plate_m', 'glass_m', 'metal_m', 'wood_h', 'glass_h', 'metal_h', 'mining', 'clank', 'crush',
      'step_wood', 'step_concrete', 'step_grass', 'step_heavy', { id: 'levelup', n: 1 }, { id: 'unlock', n: 1 }, { id: 'start', n: 1 }];
    await Promise.all([loadSounds('assets/audio/se', SE), this.hero.load('assets/images/cat.aseprite')]);
    this.hero.place(...START_POS);
    await this.shoppers.spawn(12, [[-6, 12], [6, 12], [-12, 6], [12, -2], [0, -2], [-15, -9], [24, 0], [25, 10], [-25, -8], [-26, 12], [8, -17], [-14, -17]]);

    // タイトル中はモールの上をゆっくり回る
    this.controls.target.set(0, 1, -4);
    this.camera.position.set(0, 40, 60);
    this.controls.autoRotate = true; this.controls.autoRotateSpeed = 0.5;
    this.controls.update();
    this.zukan = new Zukan();
    let q = 'normal'; try { q = localStorage.getItem('nekopunch.quality') || q; } catch (e) { /* 保存できない時は標準 */ }
    this.setQuality(QUALITY[q] ? q : 'normal');
    this.hud.update();
  }

  begin() {
    unlockAudio(); sfx('start');
    this.state = 'play';
    this.hud.hideTitle();
    this.controls.autoRotate = false;
    const p = this.hero.position;
    this.controls.target.set(p.x, 0.4, p.z);
    this.camDist = this.desiredDist();
    this.camera.position.set(p.x, 0.4 + this.camDist * Math.cos(0.95), p.z + this.camDist * Math.sin(0.95));
    this.hud.toast('Lv.1　まずは 部屋の小物 から！', 'J / F でねこパンチ');
  }

  // デバッグ用：レベルを直接変える
  setLevel(L) {
    this.level = THREE.MathUtils.clamp(L, 1, GROW.maxLevel); this.xp = Math.max(this.xp, this.req[this.level - 1]); this.hud.update();
    if (this.level >= SPACE_LEVEL && !this.inSpace) this.goToSpace();
  }

  desiredDist() { return (3.0 + 2.9 * this.hero.scale) * this.zoom; }
  targetScale() {
    const L = this.level, a = this.req[L - 1], b = this.req[L];
    const frac = Number.isFinite(b) ? THREE.MathUtils.clamp((this.xp - a) / Math.max(1, b - a), 0, 1) : 0;
    return Math.pow(GROW.scalePerLevel, L - 1 + frac * GROW.grow);
  }

  onBreak(b, how) {
    this.broken++; this.yen += b.yen;
    this.hud.ticker(b, this.zukan.add(b.kind));
    const t = this.clock.elapsedTime;
    this.combo = t - this.lastBreak < 1.4 ? this.combo + 1 : 1; this.lastBreak = t;
    if (how !== 'collapse') this.xp += b.xp;
    if (how !== 'collapse') {
      const [x0, x1, z0, z1] = b.rect;
      this.hud.pop((x0 + x1) / 2, b.y + b.h, (z0 + z1) / 2, '+' + fmtYen(b.yen), b.tier >= 4 ? 'big' : '');
      if (this.combo >= 3) this.hud.combo(this.combo);
    }
    while (this.state === 'play' && this.xp >= this.req[this.level]) this.levelUp();
    if (this.state === 'play' && this.finals.every(p => p.broken)) this.startCollapse();
    this.hud.update();
  }

  // 足音：床の種類で音を変える。大きくなるとズシンと揺れる
  onStep() {
    const p = this.hero.position, s = this.hero.scale;
    const inRoom = p.x > ROOM.x0 && p.x < ROOM.x1 && p.z > ROOM.z0 && p.z < ROOM.z1;
    const inMall = p.x > MALL.x0 && p.x < MALL.x1 && p.z > MALL.z0 && p.z < MALL.z1 + 14;
    step(inRoom && s < 3 ? 'wood' : inMall ? 'concrete' : 'grass', s);
    if (s >= 8) this.impact.shake = Math.max(this.impact.shake, Math.min(0.25, 0.04 * Math.log2(s)));
  }

  onLocked(b, x, z) {
    const t = this.clock.elapsedTime;
    if (t - this.lockMsgAt < 0.5) return;
    this.lockMsgAt = t;
    this.hud.pop(x, this.hero.position.y + this.hero.height * 1.2, z, `かたい！ Lv.${unlockLevel(b.tier)} で壊せる`, 'locked');
  }

  levelUp() {
    this.level++;
    const T = this.tier, newTier = unlockLevel(T) === this.level;
    sfx(newTier ? 'unlock' : 'levelup');
    this.hud.toast(`LEVEL UP!　Lv.${this.level}`, newTier ? `「${TIERS[T].label}」が壊せるようになった！` : 'からだが大きくなった！', newTier);
    if (this.level === SPACE_LEVEL && !this.inSpace) this.startLaunch();
    if (this.inSpace) this.revealSpace();
  }

  // 大きくなりすぎて地球を飛び出す（上へ飛び → 空が黒くなり → 白く光って宇宙へ）
  startLaunch() {
    this.state = 'launch'; this.launchT = 0; this.launched = false;
    this.hud.toast('大きくなりすぎた…！', '地球を 飛び出すぞ！', true);
  }
  updateLaunch(dt) {
    const t = (this.launchT += dt), hero = this.hero;
    if (!this.launched) {
      hero.vy = 0; hero.position.y += dt * hero.height * (1.5 + t * t * 8);
      this.impact.shake = Math.max(this.impact.shake, 0.3);
      this.mall.setSky(THREE.MathUtils.clamp((t - 0.3) / 1.5, 0, 1), this.scene);
      this.flash.style.opacity = THREE.MathUtils.clamp((t - 1.5) / 0.5, 0, 1);
      if (t >= 2.1) { this.goToSpace(); this.launched = true; }
    } else {
      this.flash.style.opacity = THREE.MathUtils.clamp(1 - (t - 2.1) / 0.7, 0, 1);
      if (t >= 2.9) { this.state = 'play'; this.hud.toast('宇宙に 飛び出した！', 'つぎは 人工衛星や 小惑星を 壊せ！', true); }
    }
  }
  // 今のレベルで壊せる段階までの宇宙の物を出す（ポンッと大きくなって現れる）
  revealSpace() {
    let n = 0;
    for (const b of this.mall.list) if (b.area === 'space' && b.hidden && b.tier <= this.level) { b.hidden = false; b.popT = 0; n++; }
    if (n && this.level > SPACE_LEVEL) { sfx('unlock'); this.hud.toast(`LEVEL UP!　Lv.${this.level}`, `「${TIERS[this.tier].label}」が あらわれた！`, true); }
  }
  // 宇宙ステージへ切り替える（カメラの向きはそのまま）
  goToSpace() {
    const { camera, controls, hero } = this;
    this.mall.enterSpace(this.scene);
    for (const c of this.shoppers.list) c.g.visible = false;
    const off = this._a.copy(camera.position).sub(controls.target);
    hero.place(...SPACE.start);
    controls.target.set(hero.position.x, hero.height * 0.55, hero.position.z);
    camera.position.copy(controls.target).add(off.y < 0 ? off.negate() : off);
    this.collision.bounds = SPACE_BOUNDS;
    this.revealSpace();
  }

  startCollapse() {
    this.state = 'collapse'; this.collapseT = 0; this.collapseNext = 0;
    this.endTime = this.playTime;
    sfx('collapse');
    this.hud.toast(this.inSpace ? '太陽系が くずれる！！' : '街が くずれる！！', '', true);
    this.concrete = this.inSpace ? [toon(0x8a8278), toon(0xffb030), toon(0x6a6660), toon(0xc8643a)] : [toon(0xd8d0c0), toon(0xb8ad9a), toon(0xe8e0d0), toon(0x9a9fa8)];
  }

  updateCollapse(dt) {
    this.collapseT += dt;
    this.impact.shake = Math.max(this.impact.shake, 0.6);
    const tc = this.collapseT;
    // 空からがれきが降ってくる（ねこのまわり）
    const hp = this.hero.position, D = this.camDist;
    if (tc < 5) for (let i = 0; i < 3; i++) {
      const s = R(0.02, 0.07) * D;
      this.combat.spawnDebris(this.concrete[i % this.concrete.length], this._a.set(hp.x + R(-1, 1) * D, R(0.5, 0.9) * D, hp.z + R(-1, 1) * D), this._b.set(s * R(1, 2), s * 0.4, s * R(1, 2)), this._v.set(R(-1, 1), -R(0.1, 0.3) * D, R(-1, 1)));
    }
    // 残った物も次々に壊れる
    if (tc > 0.8 && tc < 5.5) {
      this.collapseNext -= dt;
      if (this.collapseNext <= 0) {
        this.collapseNext = 0.03;
        const left = this.mall.list.filter(b => !b.broken && b.tier >= 4 && (b.area === 'space') === !!this.inSpace);   // いまいる場所（地球 / 宇宙）の物だけ
        for (let i = 0; i < 4 && left.length; i++) this.combat.shatter(left.splice(Math.floor(Math.random() * left.length), 1)[0], 'collapse');
      }
    }
    if (tc > 7) { this.state = 'result'; this.hud.showResult(); }
  }

  // 画質を変える（解像度・なめらかさ・影の細かさ・描く回数）。選んだ画質はこのブラウザに覚えておく
  setQuality(name) {
    const q = QUALITY[name]; this.quality = name;
    this.engine.fx.setQuality(q);
    const sh = this.mall.sun.shadow;
    if (sh.mapSize.x !== q.shadow) { sh.mapSize.set(q.shadow, q.shadow); sh.map?.dispose(); sh.map = null; }
    try { localStorage.setItem('nekopunch.quality', name); } catch (e) { /* 覚えられなくても続ける */ }
  }
  // 1 秒に描く回数の上限：タイトルは 30、図鑑を開いている間は後ろのゲーム画面を描かない
  get fpsCap() { return this.state === 'title' ? Math.min(30, QUALITY[this.quality].fps) : QUALITY[this.quality].fps; }

  start() {
    let last = 0;
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (this.state === 'zukan') { this.music.update(1 / 60); this.clock.getDelta(); return; }
      if (now - last < 1000 / this.fpsCap - 2) return;   // 上限より早い時は描かない（120Hz の画面でも 60 回まで）
      last = now; this.update();
    };
    requestAnimationFrame(loop);
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05), t = this.clock.elapsedTime;
    const { hero, camera, controls, impact } = this;
    camera.getWorldDirection(this.camFwd); this.camFwd.y = 0; this.camFwd.normalize();
    const frozen = impact.hitStop > 0; impact.hitStop -= dt;
    const gdt = frozen ? 0 : dt;
    if (this.state === 'play') this.playTime += dt;
    if (this.state === 'collapse') this.updateCollapse(dt);
    if (this.state === 'launch') this.updateLaunch(dt);
    const L = this.level;
    this.music.play(this.state === 'launch' ? 'space'
      : this.state === 'play' || this.state === 'zukan' ? (this.inSpace ? (L >= 12 ? 'boss' : 'space') : L <= 4 ? 'dream' : L <= 7 ? 'arplands' : 'boss')
      : this.state === 'result' ? 'dream' : null);
    this.music.update(dt);

    // 大きさはなめらかに追いつく
    const ts = this.targetScale();
    if (Math.abs(ts - hero.scale) > 1e-4) hero.setScale(THREE.MathUtils.damp(hero.scale, ts, 3, dt));
    hero.update(gdt, t);
    this.combat.update(gdt, t);
    this.shoppers.update(gdt, t);

    // カメラ：ねこを追い、距離はねこの大きさに合わせる
    if (this.state !== 'title') {
      const before = this._b.copy(controls.target);
      controls.target.lerp(this._a.set(hero.position.x, hero.position.y + hero.height * 0.55, hero.position.z), 1 - Math.exp(-dt * 6));
      camera.position.add(before.sub(controls.target).negate());
      this.camDist = THREE.MathUtils.damp(this.camDist, this.desiredDist() * (this.state === 'collapse' || this.state === 'result' ? 1.8 : 1), 3, dt);
      const off = this._a.copy(camera.position).sub(controls.target);
      camera.position.copy(controls.target).addScaledVector(off.normalize(), this.camDist);
    }
    controls.update();
    const near = THREE.MathUtils.clamp(this.camDist * 0.02, 0.05, 50);
    if (Math.abs(camera.near - near) > near * 0.1) { camera.near = near; camera.far = Math.max(900, this.camDist * 40); camera.updateProjectionMatrix(); }
    const fogD = this.state === 'title' ? 60 : this.camDist;
    this.scene.fog.near = fogD * 2.2; this.scene.fog.far = fogD * 11;
    this.mall.update(dt, t, camera, hero);
    this._a.set(hero.position.x, hero.position.y + hero.height * 0.5, hero.position.z);
    this.engine.fx.focusOn(this.state === 'title' ? controls.target : this._a, dt);
    this.hud.frame(dt);

    // 画面揺れ（描画の間だけカメラをずらす）
    const shk = Math.max(0, impact.shake) * 0.12 * Math.sqrt(hero.scale); impact.shake -= dt;
    const sx = (Math.random() * 2 - 1) * shk, sy = (Math.random() * 2 - 1) * shk;
    camera.position.x += sx; camera.position.y += sy;
    // 影は 2 フレームに 1 回だけ描き直す。影を落とす範囲も、描き直すフレームでだけ動かす
    // （範囲だけ動かして影を描き直さないと、古い影がずれて地面がチカチカする）
    if ((this.frameNo = (this.frameNo || 0) + 1) % 2 === 0) {
      this.mall.followSun(controls.target, this.state === 'title' ? 60 : this.camDist);
      this.engine.renderer.shadowMap.needsUpdate = true;
    }
    this.engine.fx.render();
    camera.position.x -= sx; camera.position.y -= sy;
  }
}
