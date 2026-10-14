// レンダラー・シーン・カメラ・ポストプロセスの土台
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DPR } from '../config.js';
import { createPostFX } from './postfx.js';
import { setLineResolution } from './outline.js';

export function createEngine() {
  // 画面そのものの MSAA は使わない（ポストプロセスの描き込み先でなめらかにしている。二重にかけると重い）
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 900);
  // 見下ろしの三人称カメラ（ドラッグで回転。距離はねこの大きさに合わせてゲーム側で決める）
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false; controls.enablePan = false;
  controls.minDistance = 0.5;
  controls.maxDistance = Infinity;   // 宇宙では数十 km 離れる
  controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.25;

  const fx = createPostFX(renderer, scene, camera);

  const resizeFns = new Set();
  function resize() {
    const w = innerWidth, h = innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h); fx.setSize(w, h); setLineResolution(w, h);
    for (const f of resizeFns) f(w, h);
  }
  addEventListener('resize', resize); resize();

  return {
    renderer, scene, camera, controls, fx,
    // リサイズ時に呼ぶ関数を登録（登録時にも 1 回呼ぶ）。戻り値で解除
    onResize(fn) { resizeFns.add(fn); fn(innerWidth, innerHeight); return () => resizeFns.delete(fn); },
  };
}
