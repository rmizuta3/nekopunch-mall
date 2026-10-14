// ねこパンチ図鑑：壊したことのある物を集める。G で開く
//   壊した物は絵と名前・金額・壊した数、まだの物は黒いシルエットで「？？？」
//   壊したことのある物を選ぶと、くるくる回る 3D で大きく見られる
// 記録はこのブラウザだけに保存（localStorage。使えない時はその回だけ）
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PROPS } from './mall.js';
import { makeClockTex } from './props.js';
import { TIERS, MAX_TIER } from './config.js';
import { reseed } from './core/random.js';
import { fmtYen } from './hud.js';

const KEY = 'nekopunch.zukan.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };

export class Zukan {
  constructor() {
    this.got = load();                 // 種類 → 壊した数
    this.kinds = Object.keys(PROPS).sort((a, b) => PROPS[a].tier - PROPS[b].tier);
    this.thumbs = {};                  // 種類 → 絵（dataURL）
    this.el = document.getElementById('zukan');
    this.grid = this.el.querySelector('.grid'); this.count = this.el.querySelector('.count');
    this.detail = this.el.querySelector('.detail');
    this.isOpen = false; this.cards = {};
    this.opts = { clockTex: makeClockTex(), label: 'ラーメン' };
    this.el.querySelector('.close').onclick = () => this.close();
    this.detail.querySelector('.back').onclick = () => this.closeDetail();
    this.build();
  }

  add(kind) {
    const first = !this.got[kind];
    this.got[kind] = (this.got[kind] || 0) + 1;
    try { localStorage.setItem(KEY, JSON.stringify(this.got)); } catch (e) { /* 保存できなくても続ける */ }
    if (this.isOpen) this.refresh(kind);
    return first;
  }
  get found() { return this.kinds.filter(k => this.got[k]).length; }

  // 段階ごとの見出しとカードを作る
  build() {
    let tier = 0;
    for (const k of this.kinds) {
      const def = PROPS[k];
      if (def.tier !== tier) {
        tier = def.tier;
        const h = document.createElement('div'); h.className = 'tierhead';
        h.textContent = `段階 ${tier}　${TIERS[tier].label}`; this.grid.appendChild(h);
      }
      const c = document.createElement('div'); c.className = 'card';
      c.innerHTML = '<div class="pic"><img alt=""></div><div class="name"></div><div class="info"></div>';
      c.onclick = () => { if (this.got[k]) this.openDetail(k); };
      this.grid.appendChild(c); this.cards[k] = c;
    }
  }
  refresh(k) {
    const c = this.cards[k], def = PROPS[k], n = this.got[k] || 0;
    c.classList.toggle('unknown', !n);
    c.querySelector('.name').textContent = n ? def.name : '？？？';
    c.querySelector('.info').textContent = n ? `${fmtYen(def.yen)}　×${n}` : `段階 ${def.tier}`;
    if (this.thumbs[k]) c.querySelector('img').src = this.thumbs[k];
  }

  open() {
    this.isOpen = true; this.el.classList.add('show');
    for (const k of this.kinds) this.refresh(k);
    this.count.textContent = `${this.found} / ${this.kinds.length}`;
    this.renderThumbs();
  }
  close() { this.closeDetail(); this.isOpen = false; this.el.classList.remove('show'); }
  toggle() { this.isOpen ? this.close() : this.open(); }

  // ───── 3D の小さな舞台（絵を作る用と、大きく見る用）─────
  stage(w, h) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h); renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x9a8f80, 2.0));
    const sun = new THREE.DirectionalLight(0xfff0dd, 1.6); sun.position.set(3, 6, 4); scene.add(sun);
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.01, 100);
    return { renderer, scene, camera, root: null };
  }
  show(st, k) {
    if (st.root) st.scene.remove(st.root);
    reseed(this.kinds.indexOf(k) * 7 + 1);
    const g = new THREE.Group(); PROPS[k].build(g, { ...this.opts });
    // 大きさをそろえる（いちばん長い辺を 2 に）
    const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const s = 2 / Math.max(size.x, size.y, size.z, 1e-3);
    const root = new THREE.Group(); root.add(g); g.position.sub(c); root.scale.setScalar(s);
    st.scene.add(root); st.root = root;
    st.camera.position.set(2.0, 1.5, 3.6); st.camera.lookAt(0, 0, 0);
    return size;
  }

  // 絵は開いた時に 1 フレームに数枚ずつ作る（最初の 1 回だけ。その後は覚えておく）
  renderThumbs() {
    if (this.thumbJob) return;
    const todo = this.kinds.filter(k => !this.thumbs[k]);
    if (!todo.length) return;
    this.thumbStage = this.thumbStage || this.stage(150, 150);
    const st = this.thumbStage;
    const step = () => {
      if (!this.isOpen) { this.thumbJob = null; return; }
      for (let i = 0; i < 4 && todo.length; i++) {
        const k = todo.shift();
        try { this.show(st, k); st.renderer.render(st.scene, st.camera); this.thumbs[k] = st.renderer.domElement.toDataURL(); } catch (e) { this.thumbs[k] = ''; }
        this.refresh(k);
      }
      this.thumbJob = todo.length ? requestAnimationFrame(step) : null;
    };
    this.thumbJob = requestAnimationFrame(step);
  }

  // ───── くわしく見る ─────
  openDetail(k) {
    const d = this.detail, def = PROPS[k];
    if (!this.view) {
      this.view = this.stage(520, 400);
      d.querySelector('.view').appendChild(this.view.renderer.domElement);
      this.view.controls = new OrbitControls(this.view.camera, this.view.renderer.domElement);
      this.view.controls.enablePan = false; this.view.controls.autoRotate = true; this.view.controls.autoRotateSpeed = 2.5; this.view.controls.enableDamping = true;
    }
    const size = this.show(this.view, k);
    this.view.controls.target.set(0, 0, 0); this.view.controls.update();
    d.querySelector('.title').textContent = def.name;
    d.querySelector('.meta').innerHTML = `
      <div><span>段階</span><b>${def.tier}（${TIERS[def.tier].label}）</b></div>
      <div><span>大きさ</span><b>${fmtSize(size)}</b></div>
      <div><span>被害額</span><b>${fmtYen(def.yen)}</b></div>
      <div><span>壊した数</span><b>${this.got[k]} こ</b></div>`;
    d.classList.add('show');
    let last = 0;   // 1 秒に 30 回まで（熱くならないように）
    const loop = (now = 0) => { if (!d.classList.contains('show')) return; requestAnimationFrame(loop); if (now - last < 32) return; last = now; this.view.controls.update(); this.view.renderer.render(this.view.scene, this.view.camera); };
    loop();
  }
  closeDetail() { this.detail.classList.remove('show'); }
  // デバッグ用：ぜんぶ見つけたことにする
  unlockAll() { for (const k of this.kinds) this.got[k] = this.got[k] || 1; if (this.isOpen) this.open(); }
}

function fmtSize(v) {
  const m = Math.max(v.x, v.y, v.z);
  const f = (x) => m >= 1000 ? (x / 1000).toFixed(x >= 10000 ? 0 : 1) : m >= 10 ? x.toFixed(0) : m >= 1 ? x.toFixed(1) : (x * 100).toFixed(0);
  const u = m >= 1000 ? 'km' : m >= 1 ? 'm' : 'cm';
  return `${f(v.x)} × ${f(v.z)} × 高さ ${f(v.y)} ${u}`;
}
