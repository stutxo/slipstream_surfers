# Slipstream Surfers

A Bitcoin-network adaptation of [DanielLin0516/SUBWAY-SURFERS](https://github.com/DanielLin0516/SUBWAY-SURFERS), based on upstream commit `79f9159d97c618bf9741b480872c87e4dab16417`. The original three-lane simulation, path solver, collision system, camera, instancing, input and synthesized audio are retained and adapted. Original README: [docs/UPSTREAM-README.md](docs/UPSTREAM-README.md). The upstream snapshot contains no LICENSE file; no new license is asserted over upstream code.

## Play

Live game: [Slipstream Surfers](https://slipstream-surfers.xenocardo.chatgpt.site).

You are a non-standard transaction. Change cables, jump fees and checkpoints, slide beneath scanning eyes, use ramps to surf connected mining-rack and transaction-packet roofs, and collect sats. Slipstream opens a temporary private route and loses the surveillance drone. The scene is an arcade metaphor; no real transactions are submitted.

- Arrow keys / WASD: switch lanes, jump and slide. Space jumps.
- P / Esc: pause. M: sound.
- Touch: swipe in any direction.
- Watch demo: a deterministic 60-second showcase using the same collisions as normal play.
- Record clip: records the demo at the current screen aspect ratio, including a composed HUD and audio when sound is enabled. Download appears when finished. Demo scores do not affect personal records.

Power-ups: sat magnet, script jump boost, batching multiplier, Slipstream tunnel, one-hit mining helmet, and CPFP speed boost.

The opening starts at 14 m/s, with a first action around two seconds and a mining-rack ramp around five seconds. Speed builds toward 27 m/s sooner. Recurring rack formations offer connected rooftops, optional roof coin trails, and ramp access; the generator checks a clear route through each formation.

## Develop

```sh
npm install
npm run dev
npm test
npm run build
```

Requires Node.js 22 or newer. Build output is `dist/`; deploy that directory to any static host. Generated output and local hosting configuration are excluded from this repository.

## Assets

All original subway models have been replaced with local Bitcoin assets. See [docs/ASSETS.md](docs/ASSETS.md) for the model files, generated pixel-cat texture and generation prompt. The player is an original non-standard transaction mascot. The menus and HUD use the official white MARA Slipstream lockup and Roboto Mono font; a live white wireframe tunnel echoes the submission portal’s background. Asset sources and font license are listed in the asset documentation.

## Validation

TypeScript compilation and Vite build; simulation regressions for collision, roof support, jump/slide, powers and generated paths; demo checked at25/30/60/120fps. Browser QA covers desktop and390px phone layout, keyboard controls, pause/resume, a full demo and video download.
