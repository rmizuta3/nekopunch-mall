// xz 平面の矩形 [x0, x1, z0, z1] と円（キャラ）の押し出し
import * as THREE from 'three';

export class Collision {
  constructor() { this.rects = []; this.providers = []; this.bounds = [-Infinity, Infinity, -Infinity, Infinity]; }
  reset(bounds) { this.rects = []; this.providers = []; this.bounds = bounds || [-Infinity, Infinity, -Infinity, Infinity]; }
  add(...rects) { this.rects.push(...rects); }
  remove(rect) { this.rects = this.rects.filter(r => r !== rect); }
  // 開閉するドアや壊せる物など、状態で変わる当たり判定は関数で渡す（() => rect[]）
  addProvider(fn) { this.providers.push(fn); }
  all() { let list = this.rects; for (const f of this.providers) list = list.concat(f()); return list; }

  resolve(p, r) {
    const list = this.all();
    for (let it = 0; it < 2; it++) for (const [x0, x1, z0, z1] of list) {
      const cx = Math.max(x0, Math.min(p.x, x1)), cz = Math.max(z0, Math.min(p.z, z1));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += dx / d * (r - d); p.z += dz / d * (r - d); }
      else {
        const m = Math.min(p.x - x0, x1 - p.x, p.z - z0, z1 - p.z);
        if (m === p.x - x0) p.x = x0 - r; else if (m === x1 - p.x) p.x = x1 + r; else if (m === p.z - z0) p.z = z0 - r; else p.z = z1 + r;
      }
    }
    const [bx0, bx1, bz0, bz1] = this.bounds;
    p.x = THREE.MathUtils.clamp(p.x, bx0, bx1); p.z = THREE.MathUtils.clamp(p.z, bz0, bz1);
  }
}

// 点と矩形の距離と、矩形上の最近点
export function rectDist(px, pz, [x0, x1, z0, z1]) {
  const cx = Math.max(x0, Math.min(px, x1)), cz = Math.max(z0, Math.min(pz, z1));
  return [Math.hypot(px - cx, pz - cz), cx, cz];
}
