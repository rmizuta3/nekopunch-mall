// .aseprite ファイルをそのまま読む（書き出し不要。Aseprite で保存 → 再読み込みで反映）
// 対応：RGBA / グレースケール / インデックス、表示中のレイヤーを通常合成、リンクセル、タグ
// 仕様：https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// → { width, height, frames: [{ duration, canvas }], tags: [{ name, from, to }] }
export async function loadAseprite(src) {
  const r = await fetch(src, { cache: 'no-cache' });
  if (!r.ok) throw new Error('Aseprite ファイルを読み込めません: ' + src);
  const buf = await r.arrayBuffer(), v = new DataView(buf), u8 = new Uint8Array(buf);
  if (v.getUint16(4, true) !== 0xA5E0) throw new Error('Aseprite ファイルではありません: ' + src);
  const nFrames = v.getUint16(6, true), W = v.getUint16(8, true), H = v.getUint16(10, true);
  const depth = v.getUint16(12, true), layerOpacityValid = v.getUint32(14, true) & 1, transparentIndex = u8[28];
  const str = (p) => { const n = v.getUint16(p, true); return [new TextDecoder().decode(u8.subarray(p + 2, p + 2 + n)), p + 2 + n]; };

  const layers = [], palette = [], tags = [], frames = [];
  const parentVisible = [];   // 子レベルごとの表示状態（非表示グループの中身も隠す）
  let off = 128;
  for (let fi = 0; fi < nFrames; fi++) {
    const fBytes = v.getUint32(off, true), oldN = v.getUint16(off + 6, true), duration = v.getUint16(off + 8, true), newN = v.getUint32(off + 12, true);
    const cels = [];
    let p = off + 16;
    for (let ci = 0, n = newN || oldN; ci < n; ci++) {
      const size = v.getUint32(p, true), type = v.getUint16(p + 4, true), b = p + 6;
      if (type === 0x2004) {          // レイヤー
        const flags = v.getUint16(b, true), level = v.getUint16(b + 4, true), opacity = layerOpacityValid ? u8[b + 12] : 255;
        const visible = !!(flags & 1) && (level === 0 || parentVisible[level - 1] !== false);
        parentVisible[level] = visible;
        layers.push({ name: str(b + 16)[0], visible, group: v.getUint16(b + 2, true) === 1, opacity });
      } else if (type === 0x2019) {   // パレット
        const first = v.getUint32(b + 4, true), last = v.getUint32(b + 8, true);
        let q = b + 20;
        for (let i = first; i <= last; i++) {
          const fl = v.getUint16(q, true); palette[i] = [u8[q + 2], u8[q + 3], u8[q + 4], u8[q + 5]]; q += 6;
          if (fl & 1) q = str(q)[1];
        }
      } else if (type === 0x2018) {   // タグ
        let q = b + 10;
        for (let i = 0, n = v.getUint16(b, true); i < n; i++) {
          const [name, next] = str(q + 17);
          tags.push({ name: name.trim(), from: v.getUint16(q, true), to: v.getUint16(q + 2, true) }); q = next;
        }
      } else if (type === 0x2005) {   // セル
        const cel = { layer: v.getUint16(b, true), x: v.getInt16(b + 2, true), y: v.getInt16(b + 4, true), opacity: u8[b + 6] };
        const ct = v.getUint16(b + 7, true);
        if (ct === 1) cel.link = v.getUint16(b + 16, true);
        else if (ct === 0 || ct === 2) {
          cel.w = v.getUint16(b + 16, true); cel.h = v.getUint16(b + 18, true);
          const data = u8.subarray(b + 20, p + size);
          cel.raw = ct === 2 ? inflate(data) : Promise.resolve(data);
        }
        if (ct <= 2) cels.push(cel);
      }
      p += size;
    }
    frames.push({ duration, cels });
    off += fBytes;
  }

  // ピクセル列 → RGBA
  const toRGBA = (raw, n) => {
    const out = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      let c;
      if (depth === 32) c = [raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2], raw[i * 4 + 3]];
      else if (depth === 16) c = [raw[i * 2], raw[i * 2], raw[i * 2], raw[i * 2 + 1]];
      else c = raw[i] === transparentIndex ? [0, 0, 0, 0] : (palette[raw[i]] || [0, 0, 0, 0]);
      out.set(c, i * 4);
    }
    return out;
  };
  const celImage = async (cel) => {
    const c = document.createElement('canvas'); c.width = cel.w; c.height = cel.h;
    c.getContext('2d').putImageData(new ImageData(toRGBA(await cel.raw, cel.w * cel.h), cel.w, cel.h), 0, 0);
    return c;
  };

  const out = [];
  for (const f of frames) {
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const cels = f.cels.map(c => c.link !== undefined ? frames[c.link].cels.find(o => o.layer === c.layer) : c)
      .filter(c => c && c.raw && layers[c.layer]?.visible && !layers[c.layer].group)
      .sort((a, b) => a.layer - b.layer);
    for (const c of cels) {
      g.globalAlpha = (c.opacity / 255) * (layers[c.layer].opacity / 255);
      g.drawImage(await celImage(c), c.x, c.y);
    }
    out.push({ duration: f.duration, canvas });
  }
  return { width: W, height: H, frames: out, tags };
}
