# Slipstream Surfers

A Bitcoin-network adaptation of [DanielLin0516/SUBWAY-SURFERS](https://github.com/DanielLin0516/SUBWAY-SURFERS), based on upstream commit `79f9159d97c618bf9741b480872c87e4dab16417`. The original three-lane simulation, path solver, collision system, camera, instancing, input and synthesized audio are retained and adapted. Original README: [docs/UPSTREAM-README.md](docs/UPSTREAM-README.md). The upstream snapshot contains no LICENSE file; no new license is asserted over upstream code.

## Play

Live game: [Slipstream Surfers](https://slipstream-surfers.xenocardo.chatgpt.site).

Choose from four runners on the start screen: Transaction, PortlandHODL, IFD, or Peter Todd. The menu previews the actual animated 3D model; the choice is remembered locally and used for every run. All runners share the same movement, collisions and power-ups.

You are a non-standard transaction. Change cables, jump fees and checkpoints, slide beneath scanning eyes, use ramps to surf connected mining-rack and transaction-packet roofs, and collect sats. Slipstream grants 9 seconds of collision immunity and loses the surveillance drone. Sats and scoring continue normally; the miner has no separate arrival reward. The route stays visible throughout, a 3-second exit countdown gives warning, and a 1.5-second exit shield lets you line up the next move. Any obstacle already overlapping during protection stays harmless until you clear it. The scene is an arcade metaphor; no real transactions are submitted.

- Arrow keys / WASD: switch lanes, jump and slide. Space jumps.
- P / Esc: pause. M: sound.
- Touch: swipe in any direction.

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

All original subway models have been replaced with local Bitcoin assets. See [docs/ASSETS.md](docs/ASSETS.md) for the model files, generated pixel-cat texture and generation prompt. Playable runners include the original non-standard transaction mascot and three human avatars based on the supplied character references. The menus and HUD use the official white MARA Slipstream lockup and Roboto Mono font; a live white wireframe tunnel echoes the submission portal’s background. Asset sources and font license are listed in the asset documentation.

## Validation

TypeScript compilation and Vite build; simulation regressions cover collision, roof support, jump/slide, powers, generated paths and a deterministic test route at 25/30/60/120 fps. Browser QA covers desktop and 390px phone layouts, keyboard controls, character selection and pause/resume.
