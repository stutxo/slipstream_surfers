export interface ChainTip {
  height: number;
  hash: string;
}

export interface ChainFeed {
  status: 'connecting' | 'live' | 'offline';
  tip: ChainTip | null;
  pendingTx: number | null;
  vsize: number | null;
}

const API = 'https://mempool.space/api/';
const TIMEOUT_MS = 8_000;
const LAUNCH_FRESHNESS_MS = 15_000;
const HASH = /^[0-9a-f]{64}$/i;

function parseTip(body: unknown) {
  const entry: unknown = Array.isArray(body) ? body[0] : null;
  if (!entry || typeof entry !== 'object') return null;
  const { id, height, previousblockhash } = entry as Record<string, unknown>;
  if (typeof height !== 'number' || !Number.isSafeInteger(height) || height < 0 ||
      typeof id !== 'string' || !HASH.test(id)) return null;
  const parent = typeof previousblockhash === 'string' && HASH.test(previousblockhash) ? previousblockhash.toLowerCase() : null;
  if (height > 0 && !parent) return null;
  return { tip: { height, hash: id.toLowerCase() }, parent };
}

function parseMempool(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const stats = body as Record<string, unknown>;
  if (typeof stats.count !== 'number' || !Number.isSafeInteger(stats.count) || stats.count < 0 ||
      typeof stats.vsize !== 'number' || !Number.isFinite(stats.vsize) || stats.vsize < 0) return null;
  return { pendingTx: stats.count, vsize: stats.vsize };
}

/** The first sample (including after a disconnect) establishes a baseline.
 *  Only a directly linked successor seen while continuously watching earns a block event. */
export function startLiveChain(
  onUpdate: (state: ChainFeed) => void,
  onBlock: (tip: ChainTip) => void,
  fetcher: typeof fetch = fetch,
  pollIntervalMs = 60_000,
) {
  let state: ChainFeed = { status: 'offline', tip: null, pendingTx: null, vsize: null };
  let observedAt: number | null = null;
  let highest = -1;
  let timer = 0;
  let active: AbortController | null = null;
  let backoff = pollIntervalMs;
  let retryAfter = 0;
  let stopped = false;

  async function poll() {
    if (stopped || active || document.hidden || !window.navigator.onLine) return;
    const controller = new AbortController();
    active = controller;
    const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    async function read(path: string) {
      const response = await fetcher(API + path, {
        signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
      });
      if (response.ok) return response.json();
      if (response.status === 429 || response.status === 503) {
        const header = response.headers.get('Retry-After');
        if (header && active === controller) {
          const until = /^\d+$/.test(header) ? Date.now() + Number(header) * 1000 : Date.parse(header);
          if (Number.isFinite(until)) retryAfter = Math.max(retryAfter, until);
        }
      }
      return null;
    }
    const [blocks, mempool] = await Promise.allSettled([read('blocks'), read('mempool')]);
    window.clearTimeout(timeout);
    if (active !== controller) return; // The tab was suspended or the feed was stopped.
    active = null;
    const block = blocks.status === 'fulfilled' ? parseTip(blocks.value) : null;
    const pool = mempool.status === 'fulfilled' ? parseMempool(mempool.value) : null;
    const now = Date.now();
    let newBlock = false;
    if (block) {
      const previous = state.tip;
      // A late timer after device sleep also starts a new baseline.
      const continuous = observedAt !== null && now - observedAt <= 2 * pollIntervalMs + TIMEOUT_MS;
      newBlock = !!(continuous && previous && block.tip.height === previous.height + 1 &&
        block.parent === previous.hash && block.tip.height > highest);
      state = { status: 'live', tip: block.tip, pendingTx: pool?.pendingTx ?? null, vsize: pool?.vsize ?? null };
      highest = Math.max(highest, block.tip.height);
      observedAt = now;
      backoff = pollIntervalMs;
    } else {
      state = { ...state, status: 'offline' };
      observedAt = null;
      backoff = Math.min(backoff * 2, 300_000);
      retryAfter = Math.max(retryAfter, now + backoff);
    }
    if (!stopped && !document.hidden && window.navigator.onLine) {
      timer = window.setTimeout(wake, Math.min(2_147_483_647, Math.max(backoff, retryAfter - now)));
    }
    onUpdate(state);
    if (block && newBlock && !stopped) onBlock(block.tip);
  }

  function suspend() {
    window.clearTimeout(timer);
    active?.abort();
    active = null;
    observedAt = null;
  }
  function wake(announce = false) {
    const remaining = retryAfter - Date.now();
    if (!active && remaining > 0) {
      timer = window.setTimeout(wake, Math.min(2_147_483_647, remaining));
      if (announce && state.status !== 'offline') {
        state = { ...state, status: 'offline' };
        onUpdate(state);
      }
      return;
    }
    void poll();
    if (announce && state.status !== 'connecting') {
      state = { ...state, status: 'connecting' };
      onUpdate(state);
    }
  }
  function availability() {
    if (document.hidden || !window.navigator.onLine) {
      suspend();
      state = { ...state, status: 'offline' };
      onUpdate(state);
      return;
    }
    if (active || state.status === 'live') return;
    window.clearTimeout(timer);
    wake(true);
  }
  /** A launch can share an active poll. Repeated launches within 15s reuse its tip. */
  function refreshIfStale() {
    if (stopped || document.hidden || !window.navigator.onLine) return;
    const age = observedAt === null ? Infinity : Date.now() - observedAt;
    if (state.status === 'live' && age >= 0 && age <= LAUNCH_FRESHNESS_MS) return;
    window.clearTimeout(timer);
    wake(true);
  }
  document.addEventListener('visibilitychange', availability);
  window.addEventListener('online', availability);
  window.addEventListener('offline', availability);
  availability();
  function stop() {
    stopped = true;
    suspend();
    document.removeEventListener('visibilitychange', availability);
    window.removeEventListener('online', availability);
    window.removeEventListener('offline', availability);
  }
  return { stop, refreshIfStale };
}
