// Endless map: built in chunks of ~100 m. Every chunk is checked with a path search before it is used,
// so there is always a way through without power-ups. Coins are laid along that way.
import { LANE_COUNT, OB, PLAYER, levelAt, speedAt, trainLength, CAR_LEN, CAR_GAP, MOVER, CPFP_SPEED } from '../config';
import type { ObKind, PowerKind, Hint } from './types';
import { Rng } from './rng';
import { PACKET, KEY_EXPOSURE, RBF_WAR, QUANTUM_WATCH } from './obstacle-variants';

export interface Spec {
  kind: ObKind;
  lane: number;
  d0: number;
  d1: number;
  cars?: number;
  variant?: number;
  hint?: Hint;
}
export interface PathPt {
  lane: number;
  top: boolean; // on a train / ramp
}
export interface SolveResult {
  ok: boolean;
  endLanes: number[];
  path: PathPt[] | null; // one state per STEP from start, null if not asked for
  failAt: number; // distance where the last reachable state was (the end if ok)
}
export const STEP = 0.5;

/** Can the run get from `start` (in one of startLanes, on the ground) to `end`? Grid search over (lane, ground/top). */
export function solve(specs: Spec[], start: number, end: number, startLanes: number[], speed: number | ((d: number) => number), wantPath = false, preferLane = 1): SolveResult {
  const speedOf = typeof speed === 'number' ? () => speed : speed;
  const n = Math.max(2, Math.ceil((end - start) / STEP) + 1);
  const L = LANE_COUNT;
  const body = new Uint8Array(n * L); // a train body: blocks the ground
  const ramp = new Float32Array(n * L).fill(-1); // distance into a ramp, -1 if none
  const walkTrain = new Uint8Array(n * L); // a train top here
  for (const s of specs) {
    if (s.kind !== 'train' && s.kind !== 'ramp' && s.kind !== 'mtrain') continue;
    const i0 = Math.max(0, Math.floor((s.d0 - start) / STEP));
    const i1 = Math.min(n - 1, Math.ceil((s.d1 - start) / STEP));
    for (let i = i0; i <= i1; i++) {
      const d = start + i * STEP;
      if (s.kind === 'mtrain') {
        // only the span where it is beside the runner; it can't be stood on
        if (d >= s.d0 - PLAYER.halfD && d <= s.d1 + PLAYER.halfD) body[i * L + s.lane] = 1;
      } else if (s.kind === 'train') {
        if (d >= s.d0 - PLAYER.halfD && d <= s.d1 + PLAYER.halfD) body[i * L + s.lane] = 1;
        if (d >= s.d0 && d <= s.d1) walkTrain[i * L + s.lane] = 1;
      } else if (d >= s.d0 && d <= s.d1) ramp[i * L + s.lane] = d - s.d0;
    }
  }
  const S = n * L * 2;
  const reach = new Uint8Array(S);
  const parent = wantPath ? new Int32Array(S).fill(-1) : null;
  // fewest lane changes wins, so the path (and the coins laid on it) does not zig-zag
  const cost = wantPath ? new Int32Array(S).fill(1 << 30) : null;
  const idx = (i: number, l: number, top: number) => (i * L + l) * 2 + top;
  const mark = (i: number, l: number, top: number, from: number) => {
    // a move that would finish past the end is not counted: the next chunk is not known yet
    if (i >= n) return;
    const k = idx(i, l, top);
    if (parent && cost) {
      const c = from < 0 ? 0 : cost[from] + (Math.floor(from / 2) % L !== l ? 1 : 0);
      if (c < cost[k]) { cost[k] = c; parent[k] = from; }
    }
    reach[k] = 1;
  };
  const groundOk = (i: number, l: number) => !body[i * L + l] && !(ramp[i * L + l] > 1.0);
  for (const l of startLanes) if (groundOk(0, l)) mark(0, l, 0, -1);
  for (let i = 0; i < n - 1; i++) {
    const sp = speedOf(start + i * STEP);
    const lcSteps = Math.ceil((sp * PLAYER.laneTime * 1.3 + 0.8) / STEP);
    const dropSteps = Math.ceil((sp * Math.sqrt((2 * OB.train.yt) / 30) + 1) / STEP);
    for (let l = 0; l < L; l++) {
      for (let top = 0; top < 2; top++) {
        const k = idx(i, l, top);
        if (!reach[k]) continue;
        const j = i + 1;
        // keep running in this lane
        if (top === 0) {
          if (ramp[j * L + l] >= 0) mark(j, l, 1, k);
          else if (!body[j * L + l]) mark(j, l, 0, k);
        } else {
          // still on the roof while over the train (its padded length counts as roof too)
          if (walkTrain[j * L + l] || body[j * L + l] || ramp[j * L + l] >= 0) mark(j, l, 1, k);
          else if (!body[j * L + l]) mark(j, l, 0, k);
        }
        // change lane
        for (const m of [l - 1, l + 1]) {
          if (m < 0 || m >= L) continue;
          if (top === 0) {
            let ok = true;
            for (let t = i; t <= Math.min(n - 1, i + lcSteps); t++) {
              if (!groundOk(t, m)) { ok = false; break; }
              if (t <= i + lcSteps / 2 && body[t * L + l]) { ok = false; break; }
            }
            if (ok) mark(i + lcSteps, m, 0, k);
          } else if (ramp[i * L + l] < 0) {
            // across train tops
            let ok = true;
            for (let t = i; t <= Math.min(n - 1, i + lcSteps); t++) {
              if (!walkTrain[t * L + m] || !walkTrain[t * L + l]) { ok = false; break; }
            }
            if (ok) mark(i + lcSteps, m, 1, k);
            // or drop off the side
            ok = true;
            for (let t = i; t <= Math.min(n - 1, i + dropSteps); t++) {
              if (walkTrain[t * L + m] || body[t * L + m] || ramp[t * L + m] >= 0) { ok = false; break; }
            }
            if (ok) mark(i + dropSteps, m, 0, k);
          }
        }
      }
    }
  }
  const endLanes: number[] = [];
  for (let l = 0; l < L; l++) if (reach[idx(n - 1, l, 0)] || reach[idx(n - 1, l, 1)]) endLanes.push(l);
  const ok = endLanes.length > 0;
  let lastI = n - 1;
  if (!ok) {
    lastI = 0;
    for (let i = n - 1; i >= 0 && !lastI; i--) for (let q = 0; q < L * 2; q++) if (reach[i * L * 2 + q]) { lastI = i; break; }
  }
  let path: PathPt[] | null = null;
  if (ok && parent && wantPath) {
    let endLane = endLanes.includes(preferLane) ? preferLane : endLanes[0];
    if (cost) for (const l of endLanes) if (Math.min(cost[idx(n - 1, l, 0)], cost[idx(n - 1, l, 1)]) < Math.min(cost[idx(n - 1, endLane, 0)], cost[idx(n - 1, endLane, 1)])) endLane = l;
    let k: number = reach[idx(n - 1, endLane, 0)] && (!cost || cost[idx(n - 1, endLane, 0)] <= cost[idx(n - 1, endLane, 1)]) ? idx(n - 1, endLane, 0) : idx(n - 1, endLane, 1);
    const nodes: { i: number; lane: number; top: boolean }[] = [];
    while (k >= 0) {
      nodes.push({ i: Math.floor(k / 2 / L), lane: Math.floor(k / 2) % L, top: k % 2 === 1 });
      k = parent[k];
    }
    nodes.reverse();
    path = new Array(n);
    path[0] = { lane: nodes[0].lane, top: nodes[0].top };
    for (let q = 1; q < nodes.length; q++) {
      const a = nodes[q - 1], b = nodes[q];
      // a lane change jumps several steps: switch lanes half way
      for (let t = a.i + 1; t <= b.i && t < n; t++) path[t] = t < (a.i + b.i) / 2 ? { lane: a.lane, top: a.top } : { lane: b.lane, top: b.top };
    }
    for (let t = 1; t < n; t++) if (!path[t]) path[t] = path[t - 1];
  }
  return { ok, endLanes, path, failAt: start + lastI * STEP };
}

export interface TrackSink {
  ob(spec: Spec): void;
  coin(lane: number, d: number, y: number): void;
  power(kind: PowerKind, lane: number, d: number, y: number): void;
}

type Pattern = 'none' | 'b1' | 'b2' | 'b3' | 't1' | 't2' | 't3' | 'tb' | 'mt';

export class Track {
  rng: Rng;
  frontier = 0;
  reach: number[] = [0, 1, 2];
  busy = [0, 0, 0]; // a lane is free for new obstacles from this distance
  nextPower = 260;
  chunks = 0;
  failures = 0; // chunks that fell back to an empty one
  lastPreferLane = 1;
  private powerIndex = 0;
  constructor(seed: number, private sink: TrackSink) {
    this.rng = new Rng(seed);
  }

  reset(seed: number, tutorial: boolean) {
    this.rng = new Rng(seed);
    this.frontier = 0;
    this.reach = [0, 1, 2];
    this.busy = [0, 0, 0];
    this.nextPower = 350;
    this.powerIndex = 0;
    this.chunks = 0;
    this.failures = 0;
    // Both first and repeat runs have an active opening; only new players see hints.
    this.layCoins(10, 16, null, 1);
    this.tutorialChunk(tutorial);
  }

  ensure(upTo: number) {
    let guard = 0;
    while (this.frontier < upTo && guard++ < 20) this.genChunk();
  }

  private tutorialChunk(hints: boolean) {
    const specs: Spec[] = [
      { kind: 'low', lane: 1, d0: 28, d1: 28 + OB.low.depth, hint: hints ? 'jump' : undefined },
      { kind: 'overhead', lane: 1, d0: 50, d1: 50 + OB.overhead.depth, hint: hints ? 'slide' : undefined },
      { kind: 'ramp', lane: 1, d0: 70, d1: 77, hint: hints ? 'ramp' : undefined },
      { kind: 'train', lane: 1, d0: 77, d1: 77 + trainLength(5), cars: 5, variant: PACKET.rack },
      { kind: 'train', lane: 0, d0: 84, d1: 84 + trainLength(6), cars: 6, variant: PACKET.rack },
      { kind: 'train', lane: 2, d0: 90, d1: 90 + trainLength(4), cars: 4, variant: PACKET.wizard },
      { kind: 'low', lane: 1, d0: 132, d1: 132 + OB.low.depth, variant: KEY_EXPOSURE },
      { kind: 'ramp', lane: 0, d0: 142, d1: 149 },
      { kind: 'train', lane: 0, d0: 149, d1: 149 + trainLength(5), cars: 5, variant: PACKET.rack },
      { kind: 'train', lane: 1, d0: 148, d1: 148 + trainLength(5), cars: 5, variant: PACKET.rack, hint: hints ? 'lane' : undefined },
      { kind: 'train', lane: 2, d0: 168, d1: 168 + trainLength(4), cars: 4, variant: PACKET.punk },
      { kind: 'low', lane: 0, d0: 215, d1: 215 + OB.low.depth },
      { kind: 'hurdle', lane: 1, d0: 215, d1: 215 + OB.hurdle.depth, variant: RBF_WAR },
      { kind: 'low', lane: 2, d0: 215, d1: 215 + OB.low.depth },
      { kind: 'overhead', lane: 2, d0: 241, d1: 241 + OB.overhead.depth, variant: QUANTUM_WATCH },
    ];
    const end = 270;
    const res = solve(specs, 0, end, [1], speedAt, true, 0);
    for (const sp of specs) this.sink.ob(sp);
    if (res.path) this.coinsAlong(res.path, specs, 0, end, 1);
    // Optional high-value roof lines make rack surfing worth choosing over a ground dodge.
    for (const rack of specs.filter(sp => sp.kind === 'train' && sp.variant === PACKET.rack)) {
      for (let d = rack.d0 + 2; d < rack.d1 - 1; d += 2.1) this.sink.coin(rack.lane, d, OB.train.yt + 0.85);
    }
    this.sink.power('magnet', 1, 18, 1.1);
    this.busy = [end, end, end];
    this.reach = res.endLanes.length ? res.endLanes : [0, 1, 2];
    this.frontier = end;
  }

  private genChunk() {
    const start = this.frontier;
    const lvl = levelAt(start);
    const v = speedAt(start);
    const end = start + this.rng.range(90, 130);
    let specs: Spec[] = [];
    let res: SolveResult | null = null;
    let busyAfter = this.busy.slice();
    const prefer = this.rng.int(0, 2);
    for (let attempt = 0; attempt < 40; attempt++) {
      const busy = this.busy.slice();
      specs = this.buildRows(start, end, lvl, v, attempt > 18, busy);
      res = solve(specs, start, end, this.reach, speedAt, true, prefer);
      if (res.ok) { busyAfter = busy; break; }
    }
    if (!res || !res.ok) {
      this.failures++;
      specs = [];
      res = solve(specs, start, end, [0, 1, 2], speedAt, true, prefer);
      busyAfter = this.busy.slice();
    }
    for (const s of specs) this.sink.ob(s);
    if (res.path) this.coinsAlong(res.path, specs, start, end, lvl);
    for (const ramp of specs.filter(o => o.kind === 'ramp')) {
      const rack = specs.find(o => o.kind === 'train' && o.variant === PACKET.rack && o.lane === ramp.lane && Math.abs(o.d0 - ramp.d1) < 0.01);
      if (rack) for (let d = ramp.d0 + 2; d < rack.d1 - 1; d += 2.1) this.coinAt(rack.lane, d, true, specs);
    }
    if (res.path && this.nextPower < end && this.nextPower >= start) this.placePower(res.path, specs, start, end);
    else if (this.nextPower < start) this.nextPower = start + 200;
    this.busy = busyAfter;
    this.reach = res.endLanes;
    this.frontier = end;
    this.chunks++;
  }

  private buildRows(start: number, end: number, lvl: number, v: number, simple: boolean, busy: number[]): Spec[] {
    const r = this.rng;
    const specs: Spec[] = [];
    const gap = v * (1.08 - 0.15 * lvl) + 1.5;
    let d = start + gap * 0.6;
    const free = (l: number, at: number) => busy[l] <= at;
    const barrier = (l: number, at: number) => {
      const kind: ObKind = r.weighted({ low: 0.4, hurdle: 0.3, overhead: lvl < 0.02 ? 0.05 : 0.3 });
      // Assign art without consuming a random draw or changing the route.
      const variant = (Math.floor(at) + l) % (kind === 'low' ? 4 : 2);
      specs.push({ kind, lane: l, d0: at, d1: at + OB[kind].depth, variant });
      busy[l] = at + v * CPFP_SPEED * 0.85;
    };
    const train = (l: number, at: number, withRamp: boolean, maxCars: number) => {
      const cars = r.int(Math.min(3, maxCars), maxCars);
      const t0 = at + (withRamp ? OB.ramp.depth : 0);
      const t1 = t0 + trainLength(cars);
      // Check the whole formation before inserting its ramp: never leave a dead-end wedge.
      if (t1 > end - 8) return false;
      if (withRamp) specs.push({ kind: 'ramp', lane: l, d0: at, d1: t0 });
      const variant = r.chance(0.72) ? PACKET.rack : r.pick([PACKET.full, PACKET.cat, PACKET.rejected, PACKET.wizard, PACKET.punk]);
      specs.push({ kind: 'train', lane: l, d0: t0, d1: t1, cars, variant });
      busy[l] = t1 + v * CPFP_SPEED * 0.8;
      return true;
    };
    const mover = (l: number, at: number, maxCars: number) => {
      // the lane must be clear from a little before the meeting point to where the train waits
      if (busy[l] > at - 10) return false;
      const cars = r.int(1, Math.min(3, maxCars));
      const len = trainLength(cars);
      specs.push({ kind: 'mtrain', lane: l, d0: at, d1: at + len / (1 + MOVER.ratio), cars, variant: r.int(PACKET.full, PACKET.punk) });
      busy[l] = at + MOVER.ratio * MOVER.trigger + len + 4;
      return true;
    };
    const lanes = [0, 1, 2];
    while (d < end - 12) {
      const L = lvl;
      const w: Record<Pattern, number> = simple
        ? { none: 0.4, b1: 0.4, b2: 0, b3: 0, t1: 0.2, t2: 0, t3: 0, tb: 0, mt: 0 }
        : {
            none: 0.04,
            b1: 0.24 - 0.10 * L,
            b2: 0.14 + 0.12 * L,
            b3: Math.max(0, L - 0.25) * 0.45,
            t1: 0.40,
            t2: 0.32 + 0.12 * L,
            t3: Math.max(0, L - 0.4) * 0.45,
            tb: 0.08 + L * 0.15,
            mt: start < 450 ? 0 : 0.04 + 0.12 * L,
          };
      const p = r.weighted(w);
      const shuffled = lanes.slice().sort(() => r.next() - 0.5);
      const maxCars = 4 + Math.round(L);
      const rampP = 0.68 + 0.15 * L;
      switch (p) {
        case 'b1': {
          const l = shuffled.find((x) => free(x, d));
          if (l !== undefined) barrier(l, d);
          break;
        }
        case 'b2':
        case 'b3': {
          const k = p === 'b2' ? 2 : 3;
          for (const l of shuffled.slice(0, k)) if (free(l, d)) barrier(l, d);
          break;
        }
        case 'mt': {
          const l = shuffled.find((x) => free(x, d - 10));
          if (l !== undefined) {
            mover(l, d, maxCars);
            // sometimes something to deal with in another lane too
            const o2 = shuffled.find((x) => x !== l && free(x, d));
            if (o2 !== undefined && r.chance(0.5 * L)) barrier(o2, d + r.range(9, 14)); // not where you dodge to at the last moment
          }
          break;
        }
        case 't1': {
          const l = shuffled.find((x) => free(x, d));
          if (l !== undefined) train(l, d, r.chance(rampP), maxCars);
          break;
        }
        case 't2':
        case 'tb':
        case 't3': {
          const k = p === 't3' ? 3 : p === 't2' ? 2 : 1;
          const ramped = r.int(0, k - 1);
          shuffled.forEach((l, i) => {
            if (!free(l, d)) return;
            const at = d + r.range(0, 6);
            if (i < k) train(l, at, i === ramped ? r.chance(rampP + 0.3) : r.chance(rampP * 0.4), maxCars);
            else if (p === 'tb') barrier(l, d + r.range(0, 4));
          });
          break;
        }
      }
      d += gap * r.range(1, 1.20);
    }
    return specs;
  }

  /** Coins along the found path, in runs; arcs over barriers, a line along train tops. */
  private coinsAlong(path: PathPt[], specs: Spec[], start: number, end: number, lvl: number) {
    const r = this.rng;
    const spacing = 2.1;
    let run = 0;
    for (let d = start + 6; d < end - 4; d += spacing) {
      if (run <= 0) {
        if (r.chance(0.32 + 0.1 * (1 - lvl))) run = r.int(6, 14);
        else { d += spacing * r.int(1, 4); continue; }
      }
      run--;
      const i = Math.min(path.length - 1, Math.max(0, Math.round((d - start) / STEP)));
      const pt = path[i];
      this.coinAt(pt.lane, d, pt.top, specs);
    }
  }

  private coinAt(lane: number, d: number, top: boolean, specs: Spec[]) {
    let y = 0.85;
    for (const s of specs) {
      if (s.lane !== lane) continue;
      if (top && (s.kind === 'train' || s.kind === 'ramp') && d >= s.d0 - 0.5 && d <= s.d1 + 0.5) {
        y = s.kind === 'train' ? OB.train.yt + 0.85 : (OB.ramp.yt * (d - s.d0)) / (s.d1 - s.d0) + 0.85;
      } else if (!top && (s.kind === 'train' || s.kind === 'ramp') && d >= s.d0 - 1 && d <= s.d1 + 1) {
        return; // never inside a train
      } else if (s.kind === 'mtrain' && d >= s.d0 - 2 && d <= s.d0 + MOVER.ratio * MOVER.trigger + 20) {
        return; // the moving train will sweep through here
      } else if (s.kind === 'low' || s.kind === 'hurdle') {
        const reach = 5;
        const t = (d - (s.d0 - reach)) / (s.d1 - s.d0 + reach * 2);
        if (t > 0 && t < 1) y = Math.max(y, 0.85 + 1.25 * Math.sin(Math.PI * t));
      } else if (s.kind === 'overhead' && d > s.d0 - 2 && d < s.d1 + 2) {
        y = 0.45;
      }
    }
    this.sink.coin(lane, d, y);
  }

  private layCoins(from: number, len: number, specs: Spec[] | null, lane: number) {
    for (let d = from; d < from + len; d += 2.1) this.sink.coin(lane, d, 0.85);
    void specs;
  }

  private placePower(path: PathPt[], specs: Spec[], start: number, end: number) {
    const kinds: PowerKind[] = ['magnet', 'shoes', 'double', 'slipstream', 'helmet', 'cpfp'];
    const kind = this.powerIndex === 0 ? 'slipstream' : this.rng.pick(kinds);
    for (let d = this.nextPower; d < end - 5; d += 3) {
      const i = Math.min(path.length - 1, Math.round((d - start) / STEP));
      const pt = path[i];
      const padding = this.powerIndex === 0 ? 3 : 6;
      const clear = specs.every((s) => s.lane !== pt.lane ||
        (pt.top && (s.kind === 'train' || s.kind === 'ramp') && d >= s.d0 && d <= s.d1) ||
        d < s.d0 - padding || d > (s.kind === 'mtrain' ? s.d0 + MOVER.ratio * MOVER.trigger + 20 : s.d1 + padding));
      if (clear) {
        const support = pt.top ? specs.find(s => s.lane === pt.lane && (s.kind === 'train' || s.kind === 'ramp') && d >= s.d0 && d <= s.d1) : undefined;
        const floor = !support ? 0 : support.kind === 'ramp' ? OB.ramp.yt * (d - support.d0) / (support.d1 - support.d0) : OB.train.yt;
        this.sink.power(kind, pt.lane, d, floor + 1.1);
        this.powerIndex++;
        this.nextPower = d + this.rng.range(150, 240);
        return;
      }
    }
    this.nextPower = end + 40;
  }
}

export { CAR_LEN, CAR_GAP };
