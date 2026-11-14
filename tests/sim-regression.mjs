// Runs the renderer-independent upstream simulation with the Bitcoin additions.
// No browser, server or network is needed. Temporary compiled files are removed afterward.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { checkSwipes } from './swipes.mjs';
import { checkLiveChain } from './live-chain.mjs';
const require = createRequire(import.meta.url);
const out = mkdtempSync(join(tmpdir(), 'slipstream-sim-'));
try {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', 'src/input.ts', 'src/live-chain.ts', 'src/block-course.ts', 'src/config.ts', 'src/sim/sim.ts', 'tests/fixtures/route.ts', 'src/sim/track.ts', 'src/sim/rng.ts', 'src/sim/types.ts', '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--outDir', out, '--rootDir', '.', '--skipLibCheck', '--strict'], { stdio: 'inherit' });
  checkSwipes(require(join(out, 'src/input.js')).bindInput);
  await checkLiveChain(require(join(out, 'src/live-chain.js')).startLiveChain);
  const { Sim, BLOCK_BONUS_SECONDS } = require(join(out, 'src/sim/sim.js'));
  const { blockCourseSeed } = require(join(out, 'src/block-course.js'));
  const blockRoute = (hash, hints) => {
    const seed = blockCourseSeed(hash);
    const game = new Sim(seed);
    game.reset(seed, hints);
    game.track.ensure(1400);
    return game.obs.filter(ob => ob.d0 > 275).map(({kind, lane, d0, variant}) => [kind, lane, d0, variant]);
  };
  const hash = '0'.repeat(56) + 'a23b7c91';
  const generated = blockRoute(hash, true);
  assert(generated.length > 0);
  assert.deepEqual(blockRoute(hash, false), generated, 'the same block replays the course with or without tutorial hints');
  assert.notDeepEqual(blockRoute(hash.slice(0,-1) + '2', false), generated, 'different block seeds generate different courses');
  const { RoutePilot } = require(join(out, 'tests/fixtures/route.js'));
  const { solve } = require(join(out, 'src/sim/track.js'));
  const { speedAt, OB, trainLength, SPEED, CPFP_SPEED, SLIPSTREAM_EXIT_GRACE, PLAYER } = require(join(out, 'src/config.js'));
  const fresh = (savedMissions) => {
    const s = new Sim(1, savedMissions); s.noSpawn = true; s.reset(1, false); s.clearWorld(); s.speedOverride = 12; s.start(); return s;
  };
  const runTo = (s, d, control = () => {}) => {
    let guard = 0;
    while (s.alive && s.d < d && guard++ < 30000) { control(s); s.update(1 / 120); }
    return s;
  };
  const ob = (s, kind, d, lane = 1, length = OB[kind].depth) => s.addOb({ kind, lane, d0: d, d1: d + length, cars: 1 });

  const hit = fresh(); ob(hit, 'train', 3); runTo(hit, 12);
  assert.equal(hit.alive, false, 'packet front still catches an unprotected transaction');

  const shield = fresh(); shield.addPower('helmet', 1, 0.5, 1.1); ob(shield, 'train', 3); ob(shield, 'low', 15);
  runTo(shield, 12); assert(shield.alive, 'helmet lets the whole first packet pass');
  assert.equal(shield.power.helmet, 0, 'helmet is consumed');
  runTo(shield, 17); assert.equal(shield.alive, false, 'a second collision is fatal');

  const tunnel = fresh(); tunnel.addPower('slipstream', 1, 0.5, 1.1); ob(tunnel, 'train', 3, 1, 137);
  runTo(tunnel, 145); assert(tunnel.alive, 'Slipstream expires safely even inside a packet');
  assert.equal(tunnel.power.slipstream, 0);
  ob(tunnel, 'low', 150); runTo(tunnel, 155); assert.equal(tunnel.alive, false, 'collision returns after the private tunnel');

  const advanceTo = (s, time, dt) => {
    while (s.alive && s.time < time - 1e-8) s.update(Math.min(dt, time - s.time));
  };
  const liveBlock = fresh({ set: 3 }), offline = fresh({ set: 3 });
  assert.equal(new Sim(1).startBlockBonus(900000), false, 'the title screen cannot earn a bonus');
  assert.equal(liveBlock.startBlockBonus(NaN), false);
  assert(liveBlock.startBlockBonus(900000));
  assert.equal(liveBlock.blockBonusSeconds, BLOCK_BONUS_SECONDS);
  for (const sim of [liveBlock, offline]) {
    sim.power.double = .5;
    sim.addCoin(1, 1, .85);
    advanceTo(sim, 1, 1 / 30);
  }
  const pickupBonus = 5 * 3 * 2;
  assert(Math.abs(liveBlock.score - offline.score - pickupBonus) < 1e-8, 'only the pickup points double, including mission and batching multipliers');
  assert.equal(liveBlock.coins, 1);
  assert.deepEqual(liveBlock.missions.state, offline.missions.state);
  const remaining = liveBlock.blockBonusSeconds;
  assert.equal(liveBlock.startBlockBonus(900000), false);
  assert.equal(liveBlock.startBlockBonus(899999), false);
  assert.equal(liveBlock.blockBonusSeconds, remaining, 'duplicate and older blocks cannot refresh the window');
  assert(liveBlock.startBlockBonus(900001));
  assert.equal(liveBlock.blockBonusSeconds, BLOCK_BONUS_SECONDS, 'a second new height refreshes without stacking time');
  for (const sim of [liveBlock, offline]) {
    sim.power.slipstream = .2;
    advanceTo(sim, BLOCK_BONUS_SECONDS + 2, 1 / 30);
    sim.addCoin(1, sim.d + 1, .85);
    sim.update(.1);
  }
  assert.equal(liveBlock.blockBonusSeconds, 0);
  assert.equal(liveBlock.coins, 23, 'miner passage pays the ordinary 21 sats alongside two collected sats');
  assert(Math.abs(liveBlock.score - offline.score - pickupBonus) < 1e-8, 'distance, miner passage and pickups after expiry add ordinary points');
  assert(liveBlock.startBlockBonus(900002));
  liveBlock.reset(1, false); liveBlock.clearWorld(); liveBlock.start();
  assert.equal(liveBlock.blockBonusSeconds, 0);
  assert.equal(liveBlock.startBlockBonus(900002), false, 'restarting cannot replay a block');
  assert(liveBlock.startBlockBonus(900003));
  ob(liveBlock, 'low', 3); runTo(liveBlock, 12);
  assert(!liveBlock.alive && liveBlock.blockBonusSeconds === 0, 'live blocks preserve collisions and the bonus ends on a crash');
  assert.equal(liveBlock.startBlockBonus(900004), false);
  for (const fps of [25, 30, 60, 120]) {
    const delivery = fresh();
    delivery.power.cpfp = .6; // Speed changes between power expiry and miner passage.
    delivery.power.slipstream = .25;
    while (delivery.power.slipstream > 0) delivery.update(1 / fps);
    const minerAt = delivery.d + delivery.minerOffset;
    assert.equal(delivery.coins, 0, 'delivery pays at the miner, not on tunnel expiry');
    while (delivery.d < minerAt) {
      assert.equal(delivery.coins, 0);
      assert(Math.abs(delivery.d + delivery.minerOffset - minerAt) < 1e-9);
      delivery.update(1 / fps);
    }
    assert.equal(delivery.coins, 21, 'arriving at the miner awards exactly 21 sats');
    advanceTo(delivery, 3, 1 / fps);
    assert.equal(delivery.coins, 21);
    assert.deepEqual(delivery.drainEvents().filter(e => e.type === 'delivery'), [{ type: 'delivery', sats: 21 }]);
    assert.equal(delivery.missions.state.pickups, 0, 'delivery payout is separate from sat pickups');
    assert.equal(delivery.missions.state.deliveries, 1);
  }
  const interrupted = fresh();
  interrupted.power.slipstream = .01;
  interrupted.update(.05);
  interrupted.reset(4, false); interrupted.clearWorld(); interrupted.start();
  runTo(interrupted, 30);
  assert.equal(interrupted.coins, 0, 'restart cancels a pending miner payout');

  const rideRack = (s, roofCoins) => {
    ob(s, 'ramp', 5);
    s.addOb({ kind: 'train', lane: 1, d0: 12, d1: 52, variant: 2, cars: 6 });
    for (let i = 0; i < roofCoins; i++) s.addCoin(1, 15 + i * 2, OB.train.yt + .85);
    runTo(s, 48);
  };
  const progress = fresh();
  rideRack(progress, 7);
  const restored = fresh(JSON.parse(JSON.stringify(progress.missions.state)));
  rideRack(restored, 6);
  assert.equal(restored.missions.state.rooftopBest, 7, 'best single-run roof count persists without adding different runs');
  assert.equal(restored.missions.state.pickups, 13, 'ordinary pickups accumulate across runs');

  const roofMagnet = fresh();
  roofMagnet.addOb({ kind: 'train', lane: 2, d0: 5, d1: 35, variant: 2, cars: 4 });
  roofMagnet.addCoin(2, 10, OB.train.yt + .85);
  roofMagnet.power.magnet = 2; runTo(roofMagnet, 20);
  assert.equal(roofMagnet.coins, 1);
  assert.equal(roofMagnet.missions.state.rooftopBest, 0, 'magnet snatching a roof sat from the ground does not count as surfing');

  const ready = fresh({ set: 1, rooftopBest: 0, deliveries: 1, pickups: 49 });
  rideRack(ready, 10);
  assert.equal(ready.baseMult, 2, 'finishing the three goals raises the base multiplier in play');
  assert.deepEqual(ready.missions.state, { set: 2, rooftopBest: 0, deliveries: 0, pickups: 0 });
  assert.deepEqual(ready.drainEvents().filter(e => e.type === 'level'), [{ type: 'level', set: 1, mult: 2 }]);
  ready.reset(1, false); assert.equal(ready.baseMult, 2);
  ready.power.double = 1; assert.equal(ready.mult, 4, 'batching doubles the earned base multiplier');
  const maxed = fresh({ set: 30, rooftopBest: 40, deliveries: 4, pickups: 199 });
  maxed.addCoin(1, 1, .85); runTo(maxed, 4);
  assert.equal(maxed.missions.state.set, 31, 'new mission sets remain playable at the cap');
  assert.equal(maxed.baseMult, 30);
  maxed.power.double = 1; assert.equal(maxed.mult, 60);

  for (const dt of [1 / 25, 1 / 30, 1 / 60, 1 / 120]) for (const boosted of [false, true]) {
    const label = `${Math.round(1 / dt)} fps${boosted ? ' + CPFP' : ''}`;
    const exit = fresh(); exit.speedOverride = SPEED.max;
    if (boosted) exit.power.cpfp = 999;
    const speed = SPEED.max * (boosted ? CPFP_SPEED : 1);
    exit.power.slipstream = .08;
    // This scanner is first touched after the tunnel ends, so the old single-ID
    // workaround cannot protect it. The new exit window must cover the transition.
    ob(exit, 'overhead', speed * .2 + PLAYER.halfD);
    ob(exit, 'low', speed * 2 + PLAYER.halfD);
    while (exit.power.slipstream > 0) exit.update(dt);
    assert(exit.slipstreamExitGrace > SLIPSTREAM_EXIT_GRACE - dt - .01, 'full exit grace begins on expiry: ' + label);
    advanceTo(exit, .3, dt);
    assert(exit.alive && exit.slipstreamExitGrace > 0, 'scanner just after exit is safe: ' + label);
    advanceTo(exit, 1.75, dt);
    assert(exit.alive && exit.slipstreamExitGrace === 0, 'exit grace ends on schedule: ' + label);
    assert.equal(exit.drainEvents().filter(e => e.type === 'powerEnd' && e.kind === 'slipstream').length, 1, 'expiry event fires once');
    advanceTo(exit, 2.1, dt);
    assert.equal(exit.alive, false, 'a new obstacle after grace is solid: ' + label);

    const overlaps = fresh(); overlaps.speedOverride = SPEED.max;
    if (boosted) overlaps.power.cpfp = 999;
    overlaps.power.slipstream = .08;
    // Several solids overlap at expiry, including an oncoming convoy. Every
    // already-bypassed solid stays safe until physically cleared, even beyond grace.
    ob(overlaps, 'train', .1, 1, speed * 4);
    ob(overlaps, 'train', .2, 1, speed * 6);
    overlaps.addOb({ kind: 'mtrain', lane: 1, d0: speed * .03, d1: speed * .03 + trainLength(20), cars: 20 });
    ob(overlaps, 'low', speed * 7 + PLAYER.halfD);
    advanceTo(overlaps, 6.2, dt);
    assert(overlaps.alive && overlaps.slipstreamExitGrace === 0, 'multiple long/moving packets clear safely: ' + label);
    advanceTo(overlaps, 7.1, dt);
    assert.equal(overlaps.alive, false, 'past packet immunity does not protect later hazards: ' + label);
  }

  for (const cleanup of ['reset', 'clearWorld']) {
    const clean = fresh(); clean.power.slipstream = .04; ob(clean, 'train', .1, 1, 100);
    clean.update(.08); assert(clean.slipstreamExitGrace > 0);
    if (cleanup === 'reset') { clean.reset(1, false); clean.start(); }
    else clean.clearWorld();
    assert.equal(clean.slipstreamExitGrace, 0, cleanup + ' clears pending exit protection');
    ob(clean, 'train', clean.d + 3); runTo(clean, clean.d + 8);
    assert.equal(clean.alive, false, cleanup + ' clears bypassed obstacle state');
  }

  const exitHelmet = fresh(); exitHelmet.power.slipstream = .04; exitHelmet.power.helmet = 25;
  ob(exitHelmet, 'overhead', 2); advanceTo(exitHelmet, .5, 1 / 60);
  assert(exitHelmet.alive && exitHelmet.power.helmet > 24, 'exit protection does not consume a mining helmet');

  const roof = fresh(); ob(roof, 'ramp', 10); ob(roof, 'train', 17, 1, trainLength(3)); runTo(roof, 25);
  assert(roof.alive && roof.grounded && Math.abs(roof.y - OB.train.yt) < 0.01, 'ramps still reach real walkable packet roofs');

  const controls = fresh(); ob(controls, 'low', 14); ob(controls, 'overhead', 30);
  let jumped = false, slid = false;
  runTo(controls, 35, (s) => {
    if (!jumped && s.d >= 10.2) { s.jump(); jumped = true; }
    if (!slid && s.d >= 27.6) { s.down(); slid = true; }
  });
  assert(controls.alive && jumped && slid, 'jump and slide clear their matching hazards');

  const boost = fresh(); boost.addPower('cpfp', 1, 0.5, 1.1); boost.update(0.05);
  assert(boost.speed > 14, 'CPFP increases movement speed');
  runTo(boost, 130); assert.equal(boost.power.cpfp, 0); assert.equal(boost.speed, 12, 'CPFP returns to baseline');

  const batch = fresh(); batch.addPower('double', 1, 0.5, 1.1); batch.update(0.05); assert.equal(batch.mult, 2);
  const magnet = fresh(); magnet.addPower('magnet', 1, 0.5, 1.1); magnet.addCoin(0, 8, 0.85); runTo(magnet, 15); assert.equal(magnet.coins, 1, 'magnet collects adjacent-lane sats');

  const routeRuns = [];
  for (const dt of [1 / 30, 1 / 60, 1 / 120, 0.04]) {
    const s = new Sim(1), pilot = new RoutePilot(s); pilot.reset(); s.start();
    const events = {}, powers = []; let roofTime = 0;
    while (!pilot.done && s.alive) {
      pilot.update(); s.update(dt);
      if (s.grounded && s.y >= 3.3) roofTime += dt;
      for (const e of s.drainEvents()) { events[e.type] = (events[e.type] || 0) + 1; if (e.type === 'power') powers.push(e.kind); }
    }
    assert(s.alive && pilot.done, 'scripted regression route completes using normal collision at dt=' + dt);
    assert.equal(events.crash || 0, 0); assert.equal(events.stumble || 0, 0);
    assert(events.jump >= 6 && events.slide >= 4 && events.lane >= 6);
    assert(roofTime > 12 && s.coins > 400, 'the scripted route rewards extended rooftop surfing');
    assert.deepEqual(powers, ['magnet', 'slipstream', 'cpfp', 'double', 'helmet', 'slipstream']);
    routeRuns.push({ fps: Math.round(1 / dt), sats: s.coins, roofSeconds: +roofTime.toFixed(2) });
  }
  const routes = [], opening = [];
  for (let seed = 1; seed <= 20; seed++) {
    const s = new Sim(seed); s.reset(seed, seed === 1); s.track.ensure(1600);
    const specs = s.obs.map((o) => ({ ...Sim.specOf(o), variant: o.variant }));
    const route = solve(specs, 0, s.track.frontier, [1], speedAt, true);
    assert(route.ok && route.path, 'generated mining farm has a structural route for seed=' + seed);
    assert(s.powers.some((p) => p.kind === 'slipstream' && p.d >= 325 && p.d < 400), 'first tunnel follows an active opening');
    const first = specs.reduce((a, o) => Math.min(a, o.d0), Infinity);
    assert(first / SPEED.start >= 1.75 && first / SPEED.start <= 2.5, 'initial reaction runway stays readable but brief');
    const early = specs.filter(o => o.d0 < 400), racks = early.filter(o => o.kind === 'train' && o.variant === 2);
    assert(racks.length >= 4, 'mining racks are a recurring early obstacle');
    assert(early.some(o => o.kind === 'ramp' && o.d0 < 100), 'roof surfing starts in the first few seconds');
    for (const ramp of specs.filter(o => o.kind === 'ramp')) {
      assert(specs.some(o => o.kind === 'train' && o.lane === ramp.lane && Math.abs(o.d0 - ramp.d1) < 0.01), 'every ramp reaches a real roof');
    }
    opening.push({ convoys: early.filter(o => o.kind === 'train').length, racks: racks.length, ramps: early.filter(o => o.kind === 'ramp').length });
    // Play the solver's route through the actual collision system. All powers are removed:
    // a path must be usable through ordinary lane, jump and slide controls alone.
    s.noSpawn = true; s.powers.length = 0; s.start();
    const acted = new Set(); let stumbles = 0, roofSeconds = 0;
    const pathLane = d => route.path[Math.min(route.path.length - 1, Math.max(0, Math.round(d / 0.5)))].lane;
    while (s.alive && s.d < 1200) {
      const want = pathLane(s.d + s.speed * 0.10 + 0.6);
      if (want !== s.lane && s.laneT >= 1) (want < s.lane ? s.left() : s.right());
      for (const o of s.obs) {
        if (o.lane !== s.lane || acted.has(o.id) || s.y > 2) continue;
        const ahead = o.d0 - s.d;
        if (ahead <= 0) continue;
        if ((o.kind === 'low' || o.kind === 'hurdle') && s.grounded && ahead < s.speed * 0.25 + 0.8) { s.jump(); acted.add(o.id); }
        if (o.kind === 'overhead' && !s.sliding && ahead < s.speed * 0.15 + 0.7) { s.down(); acted.add(o.id); }
      }
      s.update(1 / 60);
      if (s.grounded && s.y > 3.3) roofSeconds += 1 / 60;
      for (const event of s.drainEvents()) if (event.type === 'stumble' || event.type === 'crash') stumbles++;
    }
    assert(s.alive && s.d >= 1200 && stumbles === 0, 'real controls clear seed=' + seed + ' at ' + s.d);
    routes.push(seed);
  }
  // The opening also remains manageable while the player's CPFP speed bonus is active.
  for (const dt of [1 / 25, 1 / 30, 1 / 60, 1 / 120]) {
    const s = new Sim(1); s.reset(1, true); s.noSpawn = true; s.powers.length = 0; s.start(); s.power.cpfp = 999;
    let n = 0;
    while (s.alive && s.d < 270) {
      const wanted = s.d < 96 ? 1 : s.d < 160 ? 0 : s.d < 201 ? 1 : 2;
      if (wanted !== s.lane && s.laneT >= 1) (wanted < s.lane ? s.left() : s.right());
      const next = [28, 50, 215, 241][n];
      if (next && next - s.d < s.speed * (n === 1 || n === 3 ? 0.15 : 0.25) + 0.7) {
        if (n === 1 || n === 3) s.down(); else s.jump();
        n++;
      }
      s.update(dt);
    }
    assert(s.alive && s.d >= 270, 'opening survives CPFP (' + CPFP_SPEED + 'x) at dt=' + dt);
  }
  console.log(JSON.stringify({ ok: true, checks: 'live chain feed, live block pickup bonus, swipes, collision, powers, miner payout and clear tunnel exits at 25/30/60/120 fps with CPFP, rooftop pickups, mission persistence and multiplier cap, roof support, early density, orphan ramps, 20 generated routes, CPFP opening', routeRuns, generatedRoutes: routes.length, earlyAverages: Object.fromEntries(['convoys', 'racks', 'ramps'].map(k => [k, opening.reduce((sum, o) => sum + o[k], 0) / opening.length])) }, null, 2));
} finally { rmSync(out, { recursive: true, force: true }); }
