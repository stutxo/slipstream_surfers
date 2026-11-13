// Runs the renderer-independent upstream simulation with the Bitcoin additions.
// No browser, server or network is needed. Temporary compiled files are removed afterward.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const out = mkdtempSync(join(tmpdir(), 'slipstream-sim-'));
try {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', 'src/config.ts', 'src/sim/sim.ts', 'tests/fixtures/route.ts', 'src/sim/track.ts', 'src/sim/rng.ts', 'src/sim/types.ts', '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--outDir', out, '--rootDir', '.', '--skipLibCheck', '--strict'], { stdio: 'inherit' });
  const { Sim } = require(join(out, 'src/sim/sim.js'));
  const { RoutePilot } = require(join(out, 'tests/fixtures/route.js'));
  const { solve } = require(join(out, 'src/sim/track.js'));
  const { speedAt, OB, trainLength, SPEED, CPFP_SPEED } = require(join(out, 'src/config.js'));
  const fresh = () => {
    const s = new Sim(1); s.noSpawn = true; s.reset(1, false); s.clearWorld(); s.speedOverride = 12; s.start(); return s;
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
  console.log(JSON.stringify({ ok: true, checks: 'collision, powers, roof support, early density, orphan ramps, 20 real generated routes, CPFP opening', routeRuns, generatedRoutes: routes.length, earlyAverages: Object.fromEntries(['convoys', 'racks', 'ramps'].map(k => [k, opening.reduce((sum, o) => sum + o[k], 0) / opening.length])) }, null, 2));
} finally { rmSync(out, { recursive: true, force: true }); }
