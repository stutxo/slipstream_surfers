// Keyboard and swipe input.
export type Action = 'left' | 'right' | 'up' | 'down' | 'pause' | 'confirm' | 'mute';

export function bindInput(target: HTMLElement, on: (a: Action) => void, canSwipe: () => boolean) {
  const keys: Record<string, Action> = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down',
    Escape: 'pause', KeyP: 'pause', Enter: 'confirm', KeyM: 'mute',
  };
  window.addEventListener('keydown', (e) => {
    const a = keys[e.code];
    if (!a) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    const activation = e.code === 'Space' || e.code === 'Enter';
    if (activation && (tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'A')) return;
    if (tag === 'SUMMARY' && e.code.startsWith('Arrow')) return;
    e.preventDefault();
    if (e.repeat && a !== 'left' && a !== 'right') return;
    on(a);
  });
  let pointerId: number | null = null;
  let startX = 0, startY = 0, threshold = 0;
  const cancelSwipe = () => { pointerId = null; };
  target.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0 || pointerId !== null || !canSwipe()) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    threshold = Math.max(24, Math.min(window.innerWidth, window.innerHeight) * 0.05);
    try { target.setPointerCapture(pointerId); } catch { /* Events inside the game still work. */ }
  });

  function readSwipe(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    if (!canSwipe()) { cancelSwipe(); return; }
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
    cancelSwipe(); // Consume this gesture before dispatching the action.
    if (Math.abs(dx) > Math.abs(dy)) on(dx > 0 ? 'right' : 'left');
    else on(dy > 0 ? 'down' : 'up');
  }
  function endSwipe(e: PointerEvent) {
    if (e.pointerId === pointerId) cancelSwipe();
  }
  target.addEventListener('pointermove', readSwipe);
  target.addEventListener('pointerup', (e) => {
    readSwipe(e); // A fast flick can end before the browser delivers a move event.
    endSwipe(e);
  });
  target.addEventListener('pointercancel', endSwipe);
  target.addEventListener('lostpointercapture', endSwipe);
  window.addEventListener('blur', cancelSwipe);
  return cancelSwipe;
}
