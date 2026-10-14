// 決定論的乱数（ステージの見た目を毎回同じにするため）と、実行時用の乱数

let seed = 20261012;
export function reseed(s = 20261012) { seed = s; }
export const rnd = () => {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
export const rr = (a, b) => a + (b - a) * rnd();
export const pick = arr => arr[Math.floor(rnd() * arr.length)];

// 演出用（毎回変わってよいもの）
export const R = (a, b) => a + Math.random() * (b - a);
