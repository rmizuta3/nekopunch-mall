// キャンバスで描くテクスチャ
import * as THREE from 'three';

export const JP = '"Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic","Meiryo","Noto Sans JP",sans-serif';

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }

// lines: [[文字, サイズ, y, 色?], ...]
export function textTex(w, h, bg, fg, lines, opts = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; if (opts.round) rrect(g, 0, 0, w, h, opts.round); else g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([txt, size, y, color]) => { g.fillStyle = color || fg; g.font = `bold ${size}px ${JP}`; g.fillText(txt, w / 2, y); });
  });
}

// ドット絵用（補間なし）
export function pixTex(n, draw) {
  const t = canvasTex(n, n, draw); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}

// ふんわりした丸（湯気・影など）
export const steamTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
