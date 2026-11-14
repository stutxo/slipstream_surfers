import assert from 'node:assert/strict';

export function checkSwipes(bindInput) {
  const game = new EventTarget();
  game.setPointerCapture = () => {};
  const actions = [];
  let playing = true;
  const previousWindow = globalThis.window;
  globalThis.window = Object.assign(new EventTarget(), { innerWidth: 390, innerHeight: 844 });
  try {
    const cancelSwipe = bindInput(game, action => actions.push(action), () => playing);
    for (const [tagName, codes] of [
      ['SUMMARY', ['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']],
      ['A', ['Enter', 'Space']],
      ['BUTTON', ['Space', 'Enter']],
    ]) {
      for (const code of codes) {
        const event = Object.assign(new Event('keydown', { cancelable: true }), { code });
        Object.defineProperty(event, 'target', { value: { tagName } });
        globalThis.window.dispatchEvent(event);
        assert(!event.defaultPrevented, `${tagName} keeps its native ${code} action`);
      }
    }
    assert.deepEqual(actions, [], 'menu keys do not leak through to gameplay');
    const send = (type, x, y, id = 1) => game.dispatchEvent(Object.assign(new Event(type), {
      pointerId: id, isPrimary: id === 1, button: 0, clientX: x, clientY: y,
    }));
    for (const [x, y, direction] of [[24, 0, 'right'], [-24, 0, 'left'], [0, -24, 'up'], [0, 24, 'down']]) {
      send('pointerdown', 0, 0);
      send('pointermove', x / 2, y / 2);
      assert.deepEqual(actions, [], 'short movement does not trigger a swipe');
      send('pointermove', x, y);
      assert.deepEqual(actions, [direction], 'acts as soon as the swipe crosses the threshold');
      send('pointermove', -x * 2, -y * 2);
      send('pointerup', -x * 2, -y * 2);
      assert.deepEqual(actions.splice(0), [direction], 'one gesture has only one action');
    }

    send('pointerdown', 0, 0);
    send('pointerdown', 50, 100, 2);
    send('pointerup', 50, 200, 2);
    send('pointerup', -40, 10);
    assert.deepEqual(actions.splice(0), ['left'], 'a fast release works and a second finger cannot steal the gesture');
    send('pointerdown', 0, 0);
    send('pointerup', 8, 4);
    assert.deepEqual(actions, [], 'a tap does not move lanes');

    for (const interrupt of [
      () => send('pointercancel', 0, 0),
      () => send('lostpointercapture', 0, 0),
      () => globalThis.window.dispatchEvent(new Event('blur')),
      cancelSwipe,
      () => { playing = false; send('pointermove', 16, 0); playing = true; },
    ]) {
      send('pointerdown', 0, 0);
      interrupt();
      send('pointerup', 100, 0);
      assert.deepEqual(actions, [], 'canceled or paused gestures cannot fire on release');
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}
