// トゥーンマテリアルと反転ハル輪郭
import * as THREE from 'three';

export const gradMap = (() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 120, 175, 225, 255]), 5, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();

const matCache = new Map();
// self: 「自発光」量（店内照明のように明るく見せたい物に使う）
export function toon(color, self = 0, extra = null) {
  const key = color + '_' + self;
  if (!extra && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradMap, ...(extra || {}) });
  if (self > 0) {
    m.onBeforeCompile = s => {
      s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + self.toFixed(3) + ';');
    };
    m.customProgramCacheKey = () => 'self' + self.toFixed(3);
  }
  if (!extra) matCache.set(key, m);
  return m;
}
export const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
export const mGlass = new THREE.MeshBasicMaterial({ color: 0xa8cce6, transparent: true, opacity: 0.09, depthWrite: false });

// 反転ハル輪郭（曲面用）
const hullMats = new Map();
function hullMat(t) {
  if (hullMats.has(t)) return hullMats.get(t);
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { th: { value: t } }]),
    vertexShader: `
      uniform float th;
      #include <fog_pars_vertex>
      void main(){
        vec3 p = position + normal * th;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      void main(){
        gl_FragColor = vec4(0.075, 0.065, 0.11, 1.0);
        #include <fog_fragment>
      }`,
    side: THREE.BackSide, fog: true
  });
  hullMats.set(t, m); return m;
}
// t はワールド単位の太さ（メッシュの x スケールで補正）
export function hull(mesh, t = 0.012) {
  const h = new THREE.Mesh(mesh.geometry, hullMat(+(t / mesh.scale.x).toFixed(4)));
  h.userData.outline = false;
  mesh.add(h); mesh.userData.outline = false;
  return mesh;
}
