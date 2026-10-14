// 画面の表示（レベル・XP・被害総額・ポップアップ・タイトル・結果）
import * as THREE from 'three';
import { GROW, TIERS, MAX_TIER, unlockLevel, tierOfLevel } from './config.js';

const $ = (id) => document.getElementById(id);
// 金額：大きくなったら 万・億・兆・京・垓 で（上の 2 つの単位まで）
const UNITS = [[1e20, '垓'], [1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '万']];
export function fmtYen(n) {
  n = Math.round(n);
  if (n < 1e4) return '¥' + n.toLocaleString();
  for (let i = 0; i < UNITS.length; i++) {
    const [v, u] = UNITS[i];
    if (n < v) continue;
    const a = Math.floor(n / v), next = UNITS[i + 1];
    let s = '¥' + a.toLocaleString() + u;
    if (next) { const b = Math.floor((n - a * v) / next[0]); if (b > 0) s += b + next[1]; }
    return s;
  }
}
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class Hud {
  constructor(game) {
    this.game = game;
    this.el = { lv: $('lv'), fill: $('xp-fill'), next: $('next'), yen: $('yen'), rate: $('rate'), time: $('time'),
      toast: $('toast'), combo: $('combo'), pops: $('pops'), ticker: $('ticker'), title: $('title'), result: $('result'), hud: $('hud') };
    this.toastT = 0; this.comboT = 0; this.shownYen = 0;
    this.lines = new Map();   // テロップ：物の名前 → { el, n, yen, t }
    this._v = new THREE.Vector3();
  }

  hideTitle() { this.el.title.classList.add('hide'); this.el.hud.classList.add('show'); }

  update() {
    const g = this.game, L = g.level, a = g.req[L - 1], b = g.req[L];
    this.el.lv.textContent = L >= GROW.maxLevel ? 'Lv.MAX' : `Lv.${L}`;
    this.el.fill.style.transform = `scaleX(${Number.isFinite(b) ? Math.min(1, (g.xp - a) / Math.max(1, b - a)) : 1})`;
    const T = tierOfLevel(L);
    const left = g.finals.filter(p => !p.broken).length;
    this.el.next.innerHTML = T < MAX_TIER
      ? `こわせる：<b>${TIERS[T].label}</b> まで<br><span>Lv.${unlockLevel(T + 1)} で「${TIERS[T + 1].label}」</span>`
      : left === 0 ? '太陽系 崩壊！' : `<b>巨大な惑星と 太陽をぜんぶ壊せ！</b><br><span>のこり ${left} こ</span>`;
    this.el.rate.textContent = `${Math.floor(g.broken / g.totalCount * 100)}%`;
  }

  // 毎フレーム：被害額のカウントアップ・タイマー・トースト
  frame(dt) {
    const g = this.game;
    this.shownYen += (g.yen - this.shownYen) * Math.min(1, dt * 8);
    if (Math.abs(g.yen - this.shownYen) < 1) this.shownYen = g.yen;
    this.el.yen.textContent = fmtYen(this.shownYen);
    this.el.time.textContent = fmtTime(g.state === 'play' ? g.playTime : (g.endTime ?? g.playTime));
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.el.toast.classList.remove('show');
    if (this.comboT > 0 && (this.comboT -= dt) <= 0) this.el.combo.classList.remove('show');
    this.tickerFrame();
  }

  toast(main, sub = '', big = false) {
    const t = this.el.toast;
    t.innerHTML = `<div class="main">${main}</div>${sub ? `<div class="sub">${sub}</div>` : ''}`;
    t.classList.toggle('big', big);
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    this.toastT = 2.6;
  }

  combo(n) {
    const c = this.el.combo;
    c.textContent = `${n} COMBO!`;
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    this.comboT = 1.2;
  }

  // ワールド座標の上にふわっと出る文字
  pop(x, y, z, text, cls = '') {
    const v = this._v.set(x, y, z).project(this.game.camera);
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) return;
    if (this.el.pops.childElementCount > 24) this.el.pops.firstElementChild.remove();
    const d = document.createElement('div');
    d.className = 'pop ' + cls; d.textContent = text;
    d.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`; d.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
    this.el.pops.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }

  // 右下のテロップ。同じ物が続いたら「×3」のように 1 行にまとめる
  ticker(b, isNew = false) {
    const now = performance.now(), box = this.el.ticker;
    let L = this.lines.get(b.name);
    if (L && now - L.t > 2500) { L.el.remove(); this.lines.delete(b.name); L = null; }
    if (!L) {
      const el = document.createElement('div');
      el.className = 'line t' + Math.min(b.tier, 8);
      el.innerHTML = (isNew ? '<span class="new">NEW</span>' : '') + '<span class="name"></span><span class="n"></span><span class="yen"></span>';
      L = { el, n: 0, yen: 0, t: now }; this.lines.set(b.name, L);
      el.querySelector('.name').textContent = b.name;
    }
    L.n++; L.yen += b.yen; L.t = now;
    L.el.querySelector('.n').textContent = L.n > 1 ? `×${L.n}` : '';
    L.el.querySelector('.yen').textContent = fmtYen(L.yen);
    L.el.classList.remove('bump'); void L.el.offsetWidth; L.el.classList.add('bump');
    box.appendChild(L.el);   // いちばん下（新しい）へ
    while (box.childElementCount > 7) { const old = box.firstElementChild; for (const [k, v] of this.lines) if (v.el === old) this.lines.delete(k); old.remove(); }
  }
  // 古い行を消す（毎フレーム）
  tickerFrame() {
    const now = performance.now();
    for (const [k, L] of this.lines) {
      const age = now - L.t;
      if (age > 3200) { L.el.remove(); this.lines.delete(k); }
      else L.el.classList.toggle('fade', age > 2600);
    }
  }

  showResult() {
    const g = this.game, r = this.el.result;
    r.querySelector('.logo').textContent = g.inSpace ? '太陽系 完全崩壊！' : '街 完全崩壊！';
    const rank = g.endTime < 1500 ? 'S' : g.endTime < 2100 ? 'A' : g.endTime < 3000 ? 'B' : 'C';
    r.querySelector('.stats').innerHTML = `
      <div><span>被害総額</span><b>${fmtYen(g.yen)}</b></div>
      <div><span>壊した物</span><b>${g.broken} / ${g.totalCount}</b></div>
      <div><span>タイム</span><b>${fmtTime(g.endTime)}</b></div>
      <div><span>ランク</span><b class="rank">${rank}</b></div>`;
    r.classList.add('show');
    this.el.hud.classList.remove('show');
  }
}
