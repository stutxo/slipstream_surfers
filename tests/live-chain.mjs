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
  let feed;
  try {
    const fetcher = async (url, options) => {
      assert.equal(options.cache, 'no-store');
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
    feed = startLiveChain(state => updates.push(state), tip => rewards.push(tip.height), fetcher, 1_000);
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
    const failedCalls = calls;
    feed.refreshIfStale();
    feed.refreshIfStale();
    assert.equal(calls, failedCalls, 'launch during failure backoff uses the cached course');
    assert.equal(updates.at(-1).status, 'offline');
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
    feed.refreshIfStale();
    assert.equal(calls, beforeOnline, 'resuming respects Retry-After');
    assert.equal(updates.at(-1).status, 'offline', 'launch does not wait for Retry-After');
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
    feed.stop();
    assert.equal(timers.size, 0);
    const beforeStop = calls;
    feed.refreshIfStale();
    browser.dispatchEvent(new Event('online'));
    assert.equal(calls, beforeStop);

    // A typical run starts between the regular 60-second polls.
    tips = block(200);
    updates.length = rewards.length = 0;
    feed = startLiveChain(state => updates.push(state), tip => rewards.push(tip.height), fetcher);
    const firstCalls = calls;
    feed.refreshIfStale();
    assert.equal(updates.at(-1).status, 'connecting', 'cold launch joins the first poll');
    assert.equal(calls, firstCalls);
    await flush();
    now += 15_000;
    feed.refreshIfStale();
    assert.equal(calls, firstCalls, 'a fresh observation starts without another fetch');
    assert.equal(updates.at(-1).status, 'live');
    now += 1;
    slow = true;
    tips = block(201);
    feed.refreshIfStale();
    feed.refreshIfStale();
    assert.equal(calls, firstCalls + 2, 'multiple starts share the one stale-tip refresh');
    assert.equal(updates.at(-1).status, 'connecting', 'the UI can queue the launch synchronously');
    assert.equal(updates.at(-1).tip.height, 200);
    release();
    await flush();
    assert.equal(updates.at(-1).tip.height, 201);
    assert.deepEqual(rewards, [201], 'launch refresh preserves block observation continuity');
    tips = block(202);
    assert.equal(await advance(), 60_000);
    const duringPoll = calls;
    assert.equal(updates.at(-1).status, 'live', 'background polling keeps the last live reading visible');
    feed.refreshIfStale();
    assert.equal(updates.at(-1).status, 'connecting', 'a launch waits for the pending background poll');
    assert.equal(calls, duringPoll);
    release();
    await flush();
    assert.equal(updates.at(-1).tip.height, 202);
    assert.deepEqual(rewards, [201, 202]);
  } finally {
    feed?.stop();
    Date.now = original.now;
    for (const name of ['window','document']) {
      if (original[name] === undefined) delete globalThis[name];
      else globalThis[name] = original[name];
    }
  }
}
