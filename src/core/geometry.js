// 形状ヘルパー（p: 追加先の親オブジェクト）
import * as THREE from 'three';

export const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const geoCache = new Map();
export const cg = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };

// y は底面基準
export function box(p, x, y, z, w, h, d, m, ol = true) {
  const me = new THREE.Mesh(boxGeo, m);
  me.scale.set(w, h, d); me.position.set(x, y + h / 2, z);
  me.userData.outline = ol; p.add(me); return me;
}
export function cyl(p, x, y, z, rt, rb, h, m, seg = 16, ol = true) {
  const g = cg(`c${rt},${rb},${h},${seg}`, () => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); return g; });
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.userData.outline = ol; p.add(me); return me;
}
export function sph(p, x, y, z, r, m, sx = 1, sy = 1, sz = 1) {
  const g = cg('s', () => new THREE.SphereGeometry(1, 18, 12));
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.scale.set(r * sx, r * sy, r * sz);
  me.userData.outline = false; p.add(me); return me;
}
const UP = new THREE.Vector3(0, 1, 0);
export function rod(p, a, b, r, m, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const g = cg(`r${r},${seg}`, () => new THREE.CylinderGeometry(r, r, 1, seg));
  const me = new THREE.Mesh(g, m);
  me.scale.y = A.distanceTo(B);
  me.position.copy(A).add(B).multiplyScalar(0.5);
  me.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  me.userData.outline = false; p.add(me); return me;
}
export function plane(p, x, y, z, w, h, m, ry = 0, rx = 0) {
  const me = new THREE.Mesh(cg('pl', () => new THREE.PlaneGeometry(1, 1)), m);
  me.scale.set(w, h, 1); me.position.set(x, y, z); me.rotation.set(rx, ry, 0, 'YXZ');
  me.userData.outline = false; p.add(me); return me;
}
