// A repeatable 60-second showcase through the same simulation and collision rules as manual play.
// Distances, rather than wall-clock timers, schedule input so frame rate cannot shift a dodge.
import { OB, trainLength } from '../config';
import { Sim } from './sim';
import type { ObKind, PowerKind } from './types';

export class DemoPilot {
  readonly duration = 60;
  private acted = new Set<number>();
  constructor(private sim: Sim) {}

  get done() { return this.sim.time >= this.duration; }
  get progress() { return Math.min(1, this.sim.time / this.duration); }

  reset() {
    const s = this.sim;
    s.noSpawn = true;
    s.invincible = false;
    s.speedOverride = 0;
    s.reset(2140, false);
    s.clearWorld();
    this.acted.clear();
    const obstacle = (kind: ObKind, lane: number, d: number, cars = 1, variant = 0) => {
      const len = kind === 'train' ? trainLength(cars) : OB[kind].depth;
      s.addOb({ kind, lane, d0: d, d1: d + len, cars, variant });
    };
    const packet = (lane: number, d: number, cars: number, variant: number, ramp = false) => {
      if (ramp) { obstacle('ramp', lane, d); d += OB.ramp.depth; }
      obstacle('train', lane, d, cars, variant);
    };
    const power = (kind: PowerKind, lane: number, d: number, y = 1.1) => s.addPower(kind, lane, d, y);

    obstacle('low', 1, 32);
    obstacle('overhead', 1, 60);
    packet(1, 70, 8, 2, true);
    packet(0, 88, 9, 2);
    packet(2, 107, 4, 2);
    packet(1, 170, 3, 2);
    packet(0, 160, 4, 1);
    obstacle('hurdle', 2, 200);
    obstacle('overhead', 2, 228);
    packet(2, 250, 8, 2, true);
    packet(1, 270, 8, 2);
    packet(0, 277, 3, 0);

    // The private tunnel is picked up, never enabled by a demo-only switch.
    power('slipstream', 1, 340);
    obstacle('low', 1, 345, 1, 1);
    obstacle('hurdle', 1, 369);
    obstacle('overhead', 1, 389);
    packet(1, 403, 3, 3);
    packet(0, 350, 5, 0);
    packet(2, 381, 4, 1);
    power('cpfp', 1, 474);
    obstacle('hurdle', 1, 500);
    obstacle('overhead', 1, 535);
    packet(1, 570, 3, 3);
    packet(2, 565, 4, 0);
    packet(0, 600, 9, 2, true);
    power('double', 0, 625, OB.train.yt + 1.1);
    packet(1, 614, 9, 2);
    packet(0, 695, 3, 0);
    packet(1, 703, 3, 1);
    obstacle('low', 2, 750, 1, 2);
    obstacle('overhead', 2, 780);
    power('helmet', 2, 720);
    // A second long mining farm gives the faster final third real roof-to-roof play.
    packet(2, 810, 11, 2, true);
    packet(1, 850, 11, 2);
    packet(0, 860, 5, 1);
    packet(1, 940, 9, 2, true);
    packet(0, 970, 6, 2);
    power('slipstream', 1, 1040);
    packet(1, 1060, 3, 3);
    packet(0, 1065, 5, 1);
    packet(2, 1075, 5, 2);
    obstacle('low', 1, 1105);
    obstacle('overhead', 1, 1130);
    power('magnet', 1, 18);

    // Sats trace the intended route, arc over fee spikes, and follow the physical packet roofs.
    for (let d = 12; d < 1210; d += 2.4) {
      const lane = this.laneAt(d);
      let y = 0.85;
      const below = s.obs.filter((o) => o.lane === lane && d >= o.d0 && d <= o.d1 && o.walk);
      for (const o of below) {
        // In the tunnel, sats stay on the cable so bypassing a gate is visibly distinct from roof riding.
        if (d >= 325 && d <= 450 || d >= 1040) continue;
        y = Math.max(y, s.topAt(o, d) + 0.85);
      }
      for (const o of s.obs) {
        if (o.lane !== lane || o.kind !== 'low' && o.kind !== 'hurdle') continue;
        if (Math.abs(o.d0 - d) < 4 && !(d >= 325 && d <= 450) && d < 1040) {
          y = Math.max(y, 0.85 + 1.2 * Math.cos((o.d0 - d) / 4 * Math.PI / 2));
        }
      }
      s.addCoin(lane, d, y);
    }
  }

  private laneAt(d: number) {
    if (d < 104) return 1;
    if (d < 144) return 0;
    if (d < 160) return 1;
    if (d < 276) return 2;
    if (d < 552) return 1;
    if (d < 663) return 0;
    if (d < 668) return 1;
    if (d < 875) return 2;
    return 1;
  }

  /** Call once before sim.update(dt). This sends ordinary lane / jump / slide input only. */
  update() {
    const s = this.sim;
    if (!s.running || !s.alive || this.done) return;
    const wanted = this.laneAt(s.d);
    if (wanted !== s.lane && s.laneT >= 1) (wanted < s.lane ? s.left() : s.right());
    if (s.power.slipstream > 0) return;
    for (const o of s.obs) {
      if (o.lane !== s.lane || this.acted.has(o.id) || s.y > 2) continue;
      const ahead = o.d0 - s.d;
      if (ahead <= 0) continue;
      if ((o.kind === 'low' || o.kind === 'hurdle') && s.grounded && ahead < s.speed * 0.25 + 0.8) {
        s.jump(); this.acted.add(o.id);
      }
      if (o.kind === 'overhead' && ahead < s.speed * 0.15 + 0.7 && !s.sliding) {
        s.down(); this.acted.add(o.id);
      }
    }
    // Small rooftop hops add the same expressive movement as a manual runner.
    for (const at of [117, 291, 633]) if (s.d >= at && s.d < at + 2 && s.grounded && !this.acted.has(-at)) {
      s.jump(); this.acted.add(-at);
    }
  }
}
