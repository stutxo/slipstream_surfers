# Slipstream Surfers

A Bitcoin-network adaptation of [DanielLin0516/SUBWAY-SURFERS](https://github.com/DanielLin0516/SUBWAY-SURFERS), based on upstream commit `79f9159d97c618bf9741b480872c87e4dab16417`. The original three-lane simulation, path solver, collision system, camera, instancing, input and synthesized audio are retained and adapted. Original README: [docs/UPSTREAM-README.md](docs/UPSTREAM-README.md). The upstream snapshot contains no LICENSE file; no new license is asserted over upstream code.

## Play

Live game: [Slipstream Surfers](https://slipstream-surfers.xenocardo.chatgpt.site).

Choose from four runners on the start screen: Timmy Transaction, PortlandHODL, IFD, or Peter Todd. The menu previews the actual animated 3D model; the choice is remembered locally and used for every run. All runners share the same movement, collisions and power-ups.

You are a non-standard transaction. Change cables, jump fees and checkpoints, slide beneath scanning eyes, and follow ramps onto mining racks and inscription packets. Slipstream grants nine seconds of protection from hazards and lets you lose the surveillance drone. Cross between the miners at the tunnel exit to earn **21 in-game sats** and one miner delivery. The three-second countdown keeps the lanes ahead visible. A 1.5-second exit shield gives you time to line up your next move, and any obstacle already overlapping during protection stays harmless until you clear it.

Open **Missions** at the start, on pause, or after a run. The first set asks for 10 mining-rack rooftop sats in one run, one miner delivery, and 50 collected sats. All three goals advance together. Best rooftop count and cumulative progress are saved in this browser. A completed set raises your base score multiplier by one, up to ×30. Batching temporarily doubles the earned multiplier. Delivery rewards go into your run total, while the pickup goals count sats collected on the track.

- Arrow keys / WASD: switch lanes, jump and slide. Space jumps.
- P / Esc: pause. M: sound.
- On a touchscreen, swipe to move, jump, or roll. The move triggers as soon as your finger crosses the gesture threshold.

Power-ups: sat magnet, script jump boost, batching multiplier, Slipstream tunnel, one-hit mining helmet, and CPFP speed boost.

The opening starts at 14 m/s, with a first action around two seconds and a mining-rack ramp around five seconds. Speed builds toward 27 m/s sooner. Recurring rack formations offer connected rooftops, optional roof coin trails, and ramp access; the generator checks a clear route through each formation.

## Track guide

### Bitcoin mainnet

Every run starts on the latest Bitcoin block observed by mempool.space. Its hash sets the course. The opening obstacles are shared, then everyone on that block gets the same generated track. A run stays on its starting block through pause and resume. Starting again picks up the newest block.

The turquoise packets beside the cables get denser as the observed mempool grows in virtual bytes. When the game observes a new block extending the previous tip during active play, the tunnel turns gold and track pickups earn **double score for 21 seconds of play**. The number of sats collected stays the same.

The browser checks public block and mempool data about once a minute while visible. Starting a run also refreshes a block observation older than 15 seconds. The game remembers the last observed block for offline play. If the feed is unavailable on a first visit, the course uses Bitcoin’s genesis block (#0). [mempool.space REST API](https://mempool.space/docs/api/rest).

### Obstacles

- **RBF War** turns replace-by-fee bids into a pair of competing fee charts. Jump the hurdle or change cables.
- **Key Exposure** is a jumpable policy node. Its recovery theme refers to the use of private submission for affected Coldcard multisig spends. Sending directly to a miner can limit public pre-confirmation exposure. [Unchained’s account](https://help.unchained.com/should-i-use-slipstream-to-submit-my-transaction) and [MARA Foundation’s retrospective](https://foundation.mara.com/articles/9k-bitcoin-rescued-out-of-coldcard-multisigs).
- **Quantum Watch** is a slide-under scanner. Its theme imagines a future attacker observing a public key revealed by a pending spend. Private submission narrows who can observe that spend before confirmation. Previously revealed keys remain public. [BIP 360’s short-exposure discussion](https://bips.dev/360/).
- **Inscription packets** carry original arcade interpretations of a Taproot Wizard and an Ordinal Punk alongside the pixel cat. Look for the wizard on the right of the first rack formation. [Artwork notes](docs/ASSETS.md).

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
