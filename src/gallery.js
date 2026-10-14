// 物の見本帳（?gallery）。壊せる物を 1 つずつ並べて確認する
//   ← → で前後の物へ、ドラッグで回転、ホイールでズーム。?gallery=bench で その物から
import * as THREE from 'three';
import { createEngine } from './core/engine.js';
import { addOutlines } from './core/outline.js';
import { toon } from './core/materials.js';
import { plane } from './core/geometry.js';
import { reseed } from './core/random.js';
import { PROPS } from './mall.js';
import { makeClockTex } from './props.js';

export function startGallery(first) {
  const { renderer, scene, camera, controls, fx } = createEngine();
  controls.enableZoom = true; controls.minPolarAngle = 0.2; controls.maxPolarAngle = 1.5;
  fx.bloom.strength = 0.32; fx.bloom.threshold = 0.9;
  fx.tiltShift.uniforms.maxBlur.value = 0;
  scene.background = new THREE.Color(0xcfe4f4);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x9a8f80, 1.9));
  const sun = new THREE.DirectionalLight(0xfff0dd, 1.6); scene.add(sun); scene.add(sun.target); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const floor = plane(scene, 0, 0, 0, 5000, 5000, toon(0xe8e2d6), 0, -Math.PI / 2); floor.userData.outline = false; floor.receiveShadow = true;

  const kinds = Object.keys(PROPS).sort((a, b) => PROPS[a].tier - PROPS[b].tier);
  const label = document.createElement('div');
  label.style.cssText = 'position:fixed;left:16px;top:14px;padding:8px 14px;font:16px DotGothic16,monospace;color:#fff;background:#1a2140d8;border:3px solid #f2c94c;border-radius:6px';
  document.body.appendChild(label);
  const opts = { clockTex: makeClockTex(), label: 'ラーメン' };
  let idx = Math.max(0, kinds.indexOf(first)), cur = null;
  function show(i) {
    idx = (i + kinds.length) % kinds.length;
    if (cur) scene.remove(cur);
    reseed(idx * 7 + 1);
    const k = kinds[idx], def = PROPS[k];
    const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
    def.build(g, { ...opts });
    if (def.tier >= 2) addOutlines(root, new THREE.Group(), [g]);
    root.traverse(o => { if (o.isMesh && !o.material.isShaderMaterial) { o.castShadow = !(o.material.transparent && o.material.opacity < 0.9); o.receiveShadow = true; } });
    scene.add(root); cur = root;
    const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z, 0.2);
    controls.target.copy(c);
    camera.position.set(c.x + r * 1.1, c.y + r * 0.8, c.z + r * 2.0);
    camera.near = r * 0.01; camera.far = r * 100; camera.updateProjectionMatrix();
    const sc = sun.shadow.camera; sun.target.position.copy(c); sun.position.copy(c).add(new THREE.Vector3(12, 30, 18).normalize().multiplyScalar(r * 4));
    sc.left = sc.bottom = -r * 1.5; sc.right = sc.top = r * 1.5; sc.near = r * 0.5; sc.far = r * 8; sc.updateProjectionMatrix(); sun.shadow.bias = -0.0004; sun.shadow.normalBias = r * 0.003;
    label.textContent = `${idx + 1}/${kinds.length}　${def.name}（${k}）　tier ${def.tier}　${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}m`;
    history.replaceState(null, '', `?gallery=${k}`);
  }
  addEventListener('keydown', (e) => { if (e.code === 'ArrowRight') show(idx + 1); if (e.code === 'ArrowLeft') show(idx - 1); });
  // 一覧（サムネイルを並べた 1 枚の絵）。from 番目から n 個
  function sheet(from = 0, n = 48, cols = 8, size = 150) {
    const list = kinds.slice(from, from + n), rows = Math.ceil(list.length / cols);
    const out = document.createElement('canvas'); out.width = cols * size; out.height = rows * size;
    const g2 = out.getContext('2d'); g2.fillStyle = '#cfe4f4'; g2.fillRect(0, 0, out.width, out.height);
    const keep = idx;
    renderer.setSize(size, size, false); camera.aspect = 1; camera.updateProjectionMatrix();
    list.forEach((k, i) => {
      show(kinds.indexOf(k)); controls.update(); camera.aspect = 1; camera.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
      g2.drawImage(renderer.domElement, 0, 0, size * devicePixelRatio, size * devicePixelRatio, (i % cols) * size, Math.floor(i / cols) * size, size, size);
      g2.fillStyle = '#1a2140'; g2.font = '12px sans-serif'; g2.fillText(`${from + i + 1} ${PROPS[k].name}`, (i % cols) * size + 4, Math.floor(i / cols) * size + 14);
    });
    renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    show(keep);
    let img = document.getElementById('sheet');
    if (!img) { img = document.createElement('img'); img.id = 'sheet'; img.style.cssText = 'position:fixed;inset:0;margin:auto;max-width:100vw;max-height:100vh;z-index:5;background:#cfe4f4'; document.body.appendChild(img); img.onclick = () => img.remove(); }
    img.src = out.toDataURL();
  }
  window.gallery = { show: (k) => show(typeof k === 'string' ? kinds.indexOf(k) : k), kinds, sheet };
  show(idx);
  const loop = () => { controls.update(); renderer.shadowMap.needsUpdate = true; fx.render(); requestAnimationFrame(loop); };
  loop();
}
