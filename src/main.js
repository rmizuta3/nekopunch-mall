// エントリーポイント
//   ?debug   コンソールから window.game を触れる（例: game.setLevel(9)）
//   ?lv=N    レベル N から始める（確認用）
//   ?gallery 物の見本帳（← → で切り替え）
import { Game } from './game.js';

const params = new URLSearchParams(location.search);
if (params.has('gallery')) {
  const { startGallery } = await import('./gallery.js');
  for (const id of ['title', 'hud', 'loading']) document.getElementById(id).remove();
  startGallery(params.get('gallery'));
} else {
  const game = new Game();
  if (params.has('debug')) window.game = game;
  await game.init();
  if (params.has('lv')) game.setLevel(+params.get('lv'));
  document.getElementById('loading').remove();
  game.start();
}
