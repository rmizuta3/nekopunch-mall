// キーボード入力。押しっぱなしは isDown、押した瞬間は onAction で受け取る
import { KEYS } from '../config.js';

const keys = {};
const handlers = new Map();

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  for (const [action, codes] of Object.entries(KEYS)) {
    if (codes.includes(e.code)) for (const fn of handlers.get(action) || []) fn(e);
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

export const isDown = (action) => KEYS[action].some(c => keys[c]);
export function onAction(action, fn) {
  if (!handlers.has(action)) handlers.set(action, new Set());
  handlers.get(action).add(fn);
  return () => handlers.get(action).delete(fn);
}
