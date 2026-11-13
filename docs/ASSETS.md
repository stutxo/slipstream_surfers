# Bitcoin assets

Original procedural assets are in `src/view/models.ts`, `src/view/player.ts`, and `src/view/textures.ts`.

- Animated non-standard transaction mascot, CPFP child, batching companions, helmet and surfboard.
- Three selectable rounded arcade human runners: PortlandHODL (bald, blue shirt and laser eyes), IFD (dirty-blonde feathered hair, black outfit, gold jewelry, jeweled tiara and a gold Rolex watch), and Peter Todd (brown hair and beard, sunglasses, red shirt and a hiking backpack with padded shoulder loops). The user supplied appearance references; reference photos are not shipped with the game. Portraits are rendered locally from the playable 3D models.
- Mining-rack convoys with graphite cabinets, ASIC cooling fans, heat-sink grills, orange roof rails and cyan direction markers.
- Packet convoys: full blocks, giant JPEG inscriptions and rejection gates.
- Grumpy router checkpoints, fee charts, scanning eyes, surveillance drone with magnifier.
- Bitcoin sats, three fiber-optic cable lanes, server racks, Slipstream wireframe tunnel and mining machine.

Collision dimensions match the retained upstream simulation. The models are Three.js geometry with local canvas textures; they need no remote assets.

`public/assets/inscription-cat.png` was generated with the built-in image-generation tool. Prompt:

> Use case: stylized-concept. Asset type: square texture for a giant JPEG inscription packet in a Bitcoin arcade runner. Create a polished funny pixel-art orange tabby cat wearing tiny cyan futuristic glasses, riding a rainbow across deep violet outer space with blocky cyan and pink stars and a small orange Bitcoin coin. Intentionally chunky crisp 16-bit pixels, bright joyful arcade palette, strong central cat silhouette, flat front view. Edge-to-edge square artwork, no border, no lettering, no watermark. This is an in-world image printed on large rectangular data packets, so keep readable at a distance.

## Slipstream branding

The white MARA Slipstream lockup and Roboto Mono font match the reference at <https://slipstream.mara.com/> (retrieved 2026-11-13). Local copies avoid runtime requests to the reference website.

- `public/assets/brand/slipstream-logo.svg`: <https://slipstream.mara.com/assets/newLogo-CIitfsqE.svg>. Original MARA branding, retained as supplied.
- `public/assets/brand/roboto-mono-latin-400.woff2`: <https://slipstream.mara.com/assets/roboto-mono-latin-400-normal-GekRknry.woff2>. Font license: `public/assets/brand/OFL-RobotoMono.txt`, from <https://raw.githubusercontent.com/googlefonts/RobotoMono/main/OFL.txt>.
- The background is an original live Three.js wireframe tunnel inspired by the site's white network graphic: fine curved lines, glowing junctions and a black backdrop. It is geometry, not an embedded reference-site video.

The same local lockup appears on the loading screen, title screen, gameplay HUD and recorded replay.

`src/view/glam.ts` builds IFD’s feathered hair, tiara, necklaces, earrings, bangles and locally drawn green Rolex dial. The tiara is hidden while the mining helmet is active. `src/view/backpack.ts` builds Peter’s backpack and continuous shoulder straps. Both use procedural geometry, with no new remote assets.
