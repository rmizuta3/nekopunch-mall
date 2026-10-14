// ポストプロセス：ブルーム + HD-2D 風ティルトシフト（ミニチュア被写界深度）+ カラーグレーディング + ビネット
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { DPR } from '../config.js';

export function createPostFX(renderer, scene, camera) {
  let pr = DPR;   // 描く解像度の倍率（画質の設定で変える）
  const rt = new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.6, 0.82);
  composer.addPass(bloom);
  // 光のにじみは半分の解像度で計算する（もともとぼけた光なので見た目はほぼ同じで、4 分の 1 の手間）
  const bloomSetSize = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => bloomSetSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
  const tiltShift = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, focusY: { value: 0.45 }, band: { value: 0.14 }, maxBlur: { value: 9 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 res; uniform float focusY, band, maxBlur;
      varying vec2 vUv;
      void main(){
        float d = abs(vUv.y - focusY);
        float r = smoothstep(band, band + 0.38, d) * maxBlur;
        vec3 col = texture2D(tDiffuse, vUv).rgb;
        if (r > 0.6) {
          vec3 acc = vec3(0.0); float ws = 0.0;
          for (int i = 0; i < 32; i++) {
            float fi = float(i) + 0.5;
            float rad = sqrt(fi / 32.0) * r; float a = fi * 2.39996;
            vec3 c = texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * rad / res).rgb;
            float w = 1.0 + dot(c, vec3(0.3, 0.59, 0.11)) * 3.0;   // 明るい点ほど玉ボケ
            acc += c * w; ws += w;
          }
          col = acc / ws;
        }
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, 1.18);
        col *= mix(vec3(0.86, 0.95, 1.12), vec3(1.08, 1.0, 0.9), smoothstep(0.02, 0.5, l));
        col = col * 1.05 + 0.006;
        vec2 q = vUv - 0.5; col *= 1.0 - dot(q * vec2(1.1, 1.3), q * vec2(1.1, 1.3)) * 0.9;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  composer.addPass(tiltShift);
  composer.addPass(new OutputPass());

  const _p = new THREE.Vector3();
  return {
    composer, bloom, tiltShift,
    // 画質：解像度の倍率、なめらかにする回数（MSAA）、光のにじみ・ミニチュア風ぼかしの有無
    setQuality({ pixelRatio, samples, bloom: useBloom = true, tilt = true }) {
      pr = pixelRatio; renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
      for (const t of [composer.renderTarget1, composer.renderTarget2]) if (t.samples !== samples) { t.samples = samples; t.dispose(); }
      bloom.enabled = useBloom; tiltShift.enabled = tilt;
      this.setSize(innerWidth, innerHeight);
    },
    setSize(w, h) {
      composer.setSize(w, h);
      tiltShift.uniforms.res.value.set(w * pr, h * pr); tiltShift.uniforms.maxBlur.value = 7 * pr;
    },
    // ピントを worldPos の高さに合わせる
    focusOn(worldPos, dt) {
      const fp = _p.copy(worldPos).project(camera);
      const u = tiltShift.uniforms.focusY;
      u.value = THREE.MathUtils.damp(u.value, fp.y * 0.5 + 0.5, 6, dt);
    },
    render() { composer.render(); },
  };
}
