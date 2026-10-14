// 輪郭線（エッジ抽出 → 太線）
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const lineMats = new Set();
const res = new THREE.Vector2(innerWidth, innerHeight);
export function setLineResolution(w, h) { res.set(w, h); for (const m of lineMats) m.resolution.copy(res); }

function lineMat(width, color = 0x15121e) {
  const m = new LineMaterial({ color, linewidth: width * 0.75, worldUnits: false, transparent: true, opacity: 0.55 });
  m.resolution.copy(res); lineMats.add(m); return m;
}
const edgeCache = new Map();
function edgesOf(geo) {
  let e = edgeCache.get(geo.uuid);
  if (!e) { e = new THREE.EdgesGeometry(geo, 35).attributes.position.array; edgeCache.set(geo.uuid, e); }
  return e;
}
// userData.outline === false のメッシュと、userData.noOutline を持つグループの中身は除外
function collectEdges(root, relative = false) {
  root.updateMatrixWorld(true);
  const out = [], v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const inv = relative ? root.matrixWorld.clone().invert() : new THREE.Matrix4();
  root.traverse(o => {
    if (!o.isMesh || !o.visible || o.userData.outline === false) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.noOutline) return;
    const arr = edgesOf(o.geometry);
    const push = (mat) => { for (let i = 0; i < arr.length; i += 3) { v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(mat); out.push(v.x, v.y, v.z); } };
    if (o.isInstancedMesh) { for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, im); push(m4.multiplyMatrices(inv, tmp.multiplyMatrices(o.matrixWorld, im))); } }
    else push(m4.multiplyMatrices(inv, o.matrixWorld));
  });
  return out;
}
function makeLines(arr, width) {
  const g = new LineSegmentsGeometry(); g.setPositions(arr);
  const l = new LineSegments2(g, lineMat(width)); l.computeLineDistances(); return l;
}

// 静的な物は world 全体で 1 本に、動く物（dynamics）はそれぞれのグループに輪郭を付ける
export function addOutlines(target, world, dynamics = [], width = 1.5) {
  const add = (to, arr) => { if (arr.length) to.add(makeLines(arr, width)); };
  add(target, collectEdges(world));
  for (const d of dynamics) add(d, collectEdges(d, true));
}
// ステージ破棄時に解像度更新の対象から外す
export function releaseOutlines(root) {
  root.traverse(o => { if (o.material && lineMats.has(o.material)) { lineMats.delete(o.material); o.material.dispose(); o.geometry.dispose(); } });
}
