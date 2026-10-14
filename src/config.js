// ゲーム全体の設定値

export const DPR = Math.min(devicePixelRatio, 2);
export const PIX = 0.04;               // ドット 1px のワールドサイズ（ねこ Lv.1 の大きさの基準）

// キー割り当て（KeyboardEvent.code）
export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  attack: ['KeyJ', 'KeyF'],
  start: ['Enter', 'KeyZ'],
  restart: ['KeyR'],
  mute: ['KeyM'],
  zukan: ['KeyG'],
  quality: ['KeyP'],
  back: ['Escape'],
};

// 画質（P で切りかえ）。fps は 1 秒に描く回数の上限（Mac の画面は 120 回なので、上限がないと 2 倍描いて熱くなる）
export const QUALITY = {
  high: { label: '高', pixelRatio: Math.min(devicePixelRatio, 2), samples: 4, shadow: 2048, bloom: true, tilt: true, fps: 60 },
  normal: { label: '標準', pixelRatio: Math.min(devicePixelRatio, 1.5), samples: 0, shadow: 2048, bloom: true, tilt: true, fps: 60 },
  low: { label: '低（省エネ）', pixelRatio: 1, samples: 0, shadow: 1024, bloom: false, tilt: false, fps: 30 },
};
export const QUALITY_ORDER = ['normal', 'low', 'high'];

// 成長のバランス（1 レベル = 1 段階）
export const GROW = {
  maxLevel: 12,
  scalePerLevel: 2.4,      // 1 レベルごとの大きさの倍率（Lv.1 の 0.64m → Lv.8 で約 290m → Lv.12 で約 10km）
  grow: 0.55,              // 1 レベルの中で、壊すほど大きくなる分（次のレベルの大きさに向かって何割まで）
  // 次のレベルに必要な XP = これまでの必要量 + その段階の XP 合計 × share
  // 合計は「その段階で行ける場所（ねこ部屋 → モール → 街）」にある物だけで数える
  share: 0.6,
};
// 段階（tier）ごとの表示名・XP・耐久。tier t は Lv.t で壊せるようになる
// 大きさの目安：その時のねこの背の半分くらいまで（ねこ Lv.1 = 0.64m、段階ごとに約 2.4 倍）
export const TIERS = {
  1: { label: '小物', xp: 2, hp: 1 },
  2: { label: 'いす・テーブル・ベンチ', xp: 7, hp: 2 },
  3: { label: 'たな・自販機・車・部屋のかべ', xp: 24, hp: 3 },
  4: { label: '屋台・噴水・街路樹・店のかべ', xp: 86, hp: 4 },
  5: { label: 'モールのかべ・柱・家', xp: 300, hp: 5 },
  6: { label: 'マンション・学校・病院', xp: 1050, hp: 6 },
  7: { label: 'オフィスビル・観覧車・スタジアム', xp: 3700, hp: 7 },
  8: { label: '超高層ビル・ねこタワー', xp: 13000, hp: 8 },
  9: { label: '山・富士山・雲・タンカー', xp: 45000, hp: 9 },
  10: { label: '人工衛星・ロケット・小惑星', xp: 160000, hp: 10 },
  11: { label: '月・地球・惑星', xp: 560000, hp: 11 },
  12: { label: '木星・土星・太陽', xp: 2000000, hp: 12 },
};
export const MAX_TIER = 12;
export const SPACE_LEVEL = 10;   // このレベルになると地球を飛び出して宇宙へ
export const unlockLevel = (tier) => tier;
export const tierOfLevel = (lv) => Math.min(MAX_TIER, lv);
// その段階で行ける場所
export const AREAS = { room: 1, mall: 3, town: 5, space: 10 };   // 場所 → 行けるようになる段階
