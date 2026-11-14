import assert from 'node:assert/strict';

export async function checkLiveChain(startLiveChain) {
  const original = { window: globalThis.window, document: globalThis.document, now: Date.now };
  let now = 20_000, id = 0;
  const timers = new Map();
  const browser = Object.assign(new EventTarget(), {
    navigator: { onLine: true },
    setTimeout(fn, ms) { timers.set(++id, { fn, at: now + ms }); return id; },
    clearTimeout(key) { timers.delete(key); },
  });
  const page = Object.assign(new EventTarget(), { hidden: false });
  globalThis.window = browser;
  globalThis.document = page;
  Date.now = () => now;
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const advance = async () => {
    const task = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    assert.ok(task, 'feed should schedule a refresh');
    const [key, { at, fn }] = task;
    timers.delete(key);
    const elapsed = at - now;
    now = at;
    fn();
    await flush();
    return elapsed;
  };
  const hash = n => n.toString(16).padStart(64, '0');
  const block = (height, identity = height, parent = identity - 1) => [{ height, id: hash(identity), previousblockhash: hash(parent) }];
  const response = (body, status = 200, headers) => Response.json(body, { status, headers });
  let tips = block(100), stats = { count: 45, vsize: 234_567 }, slow = false, limited = false, stall = false;
  let release, calls = 0;
  const updates = [], rewards = [];
  let stop;
  try {
    const fetcher = async (url, options) => {
      assert.equal(options.credentials, 'omit');
      assert.equal(options.referrerPolicy, 'no-referrer');
      calls++;
      if (url === 'https://mempool.space/api/mempool') return response(stats);
      assert.equal(url, 'https://mempool.space/api/blocks');
      if (limited) return response(null, 429, { 'Retry-After': '12' });
      if (stall) return new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      });
      if (slow) return new Promise(resolve => { release = () => resolve(response(tips)); });
      return response(tips);
    };
    stop = startLiveChain(state => updates.push(state), tip => rewards.push(tip.height), fetcher, 1_000);
    await flush();
    assert.deepEqual(updates.at(-1), { status: 'live', tip: { hash: hash(100), height: 100 }, pendingTx: 45, vsize: 234_567 });
    assert.deepEqual(rewards, [], 'initial tip establishes a baseline');
    assert.equal(await advance(), 1_000);
    assert.deepEqual(rewards, [], 'repeated tip is quiet');
    for (const sample of [block(101), block(101), block(100), block(101, 120, 100), block(103, 200), block(104, 201)]) {
      tips = sample;
      await advance();
    }
    assert.deepEqual(rewards, [101, 104], 'skip repeats, reorg replay, and missed heights');
    stats = { count: -1, vsize: 2 };
    tips = block(105, 202);
    await advance();
    assert.deepEqual(rewards, [101, 104, 105]);
    assert.equal(updates.at(-1).status, 'live');
    assert.equal(updates.at(-1).pendingTx, null, 'missing/malformed stats cannot become a fake count');
    tips = [{ height: 106, id: 'bad', previousblockhash: hash(202) }];
    await advance();
    assert.equal(updates.at(-1).status, 'offline');
    assert.equal(updates.at(-1).tip.height, 105);
    tips = block(106, 203);
    assert.equal(await advance(), 2_000, 'invalid tip backs off');
    assert.deepEqual(rewards, [101, 104, 105], 'first response after failure rebaselines');

    slow = true;
    await advance();
    const before = calls;
    browser.dispatchEvent(new Event('online'));
    assert.equal(calls, before, 'a second request cannot overlap');
    page.hidden = true;
    page.dispatchEvent(new Event('visibilitychange'));
    tips = block(107, 204);
    release();
    await flush();
    assert.equal(updates.at(-1).tip.height, 106, 'discard a late response from before suspension');
    assert.equal(timers.size, 0);
    slow = false;
    page.hidden = false;
    page.dispatchEvent(new Event('visibilitychange'));
    await flush();
    assert.equal(updates.at(-1).tip.height, 107);
    assert.deepEqual(rewards, [101, 104, 105], 'resuming is silent');
    limited = true;
    await advance();
    limited = false;
    browser.navigator.onLine = false;
    browser.dispatchEvent(new Event('offline'));
    assert.equal(timers.size, 0);
    const beforeOnline = calls;
    browser.navigator.onLine = true;
    browser.dispatchEvent(new Event('online'));
    assert.equal(calls, beforeOnline, 'resuming respects Retry-After');
    assert.equal(await advance(), 12_000);
    assert.equal(updates.at(-1).status, 'live');
    tips = block(108, 250, 222);
    await advance();
    assert.deepEqual(rewards, [101, 104, 105], 'adjacent height with the wrong parent is silent');
    stall = true;
    await advance();
    assert.equal(await advance(), 8_000);
    assert.equal(updates.at(-1).status, 'offline', 'network timeout releases the outstanding poll');
    stall = false;
    tips = block(109, 251, 250);
    assert.equal(await advance(), 2_000);
    assert.equal(updates.at(-1).tip.height, 109);
    assert.deepEqual(rewards, [101, 104, 105], 'fresh baseline after a timeout');
    stop();
    assert.equal(timers.size, 0);
    const beforeStop = calls;
    browser.dispatchEvent(new Event('online'));
    assert.equal(calls, beforeStop);
  } finally {
    stop?.();
    Date.now = original.now;
    for (const name of ['window','document']) {
      if (original[name] === undefined) delete globalThis[name];
      else globalThis[name] = original[name];
    }
  }
}
