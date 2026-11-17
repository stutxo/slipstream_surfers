# Bitcoin assets

Original procedural assets are in `src/view/models.ts`, `src/view/player.ts`, and `src/view/textures.ts`.

- Timmy Transaction, the animated non-standard transaction mascot, CPFP child, batching companions, helmet and surfboard.
- Three selectable rounded arcade human runners: PortlandHODL (bald, blue shirt, laser eyes and handheld keyboard), IFD (side-parted dirty-blonde hair, black outfit, gold jewelry, jeweled tiara and handheld broadcast microphone), and Peter Todd (washed-blue Bitcoin++ Libre Relay cap over short brown hair, clear rectangular glasses, trimmed beard, red shirt, hiking backpack and three-striped black track trousers). The user supplied appearance references. Portraits are rendered locally from the playable 3D models.
- Mining-rack convoys with graphite cabinets, ASIC cooling fans, heat-sink grills, orange roof rails and cyan direction markers.
- Packet convoys: full blocks, giant JPEG inscriptions and rejection gates.
- The wizard and punk packet prints are original pixel-art tributes drawn for the game. The wizard draws on the robed, bearded character from Taproot Wizards. The punk uses the square pixel portrait format of Ordinal Punks. [Taproot Wizards collection](https://taprootwizards.com/collection) and [Ordinal Punks project](https://github.com/ordinalpunks/awesome-ordinalpunks).
- The RBF War fee chart, Key Exposure checkpoint and Quantum Watch scanner fit the existing jump and slide clearances.
- Grumpy router checkpoints, fee charts, scanning eyes, surveillance drone with magnifier.
- Bitcoin sats, three fiber-optic cable lanes, server racks, Slipstream wireframe tunnel and two mining banks framing a clear view of all three lanes.

Collision dimensions match the retained upstream simulation. The models are Three.js geometry with local canvas textures; they need no remote assets.

`public/assets/inscription-cat.png` was generated with the built-in image-generation tool. Prompt:

> Use case: stylized-concept. Asset type: square texture for a giant JPEG inscription packet in a Bitcoin arcade runner. Create a polished funny pixel-art orange tabby cat wearing tiny cyan futuristic glasses, riding a rainbow across deep violet outer space with blocky cyan and pink stars and a small orange Bitcoin coin. Intentionally chunky crisp 16-bit pixels, bright joyful arcade palette, strong central cat silhouette, flat front view. Edge-to-edge square artwork, no border, no lettering, no watermark. This is an in-world image printed on large rectangular data packets, so keep readable at a distance.

## Slipstream branding

The white MARA Slipstream lockup and Roboto Mono font match the reference at <https://slipstream.mara.com/> (retrieved 2026-11-13). Local copies avoid runtime requests to the reference website.

- `public/assets/brand/slipstream-logo.svg`: <https://slipstream.mara.com/assets/newLogo-CIitfsqE.svg>. Original MARA branding, retained as supplied.
- `public/assets/brand/roboto-mono-latin-400.woff2`: <https://slipstream.mara.com/assets/roboto-mono-latin-400-normal-GekRknry.woff2>. Font license: `public/assets/brand/OFL-RobotoMono.txt`, from <https://raw.githubusercontent.com/googlefonts/RobotoMono/main/OFL.txt>.
- The background is an original live Three.js wireframe tunnel inspired by the site's white network graphic: fine curved lines, glowing junctions and a black backdrop. It is geometry, not an embedded reference-site video.

The same local lockup appears on the loading screen, title screen and gameplay HUD.

`src/view/glam.ts` builds IFD’s layered hair, tiara, necklaces, earrings and wrist jewelry. `src/view/backpack.ts` builds Peter’s backpack and continuous shoulder straps. The mining helmet temporarily replaces IFD’s tiara or Peter’s baseball cap.

IFD and PortlandHODL have no Bitcoin badge on their backs. The original transaction mascot and Peter’s backpack retain their Bitcoin marks.

`src/view/props.ts` builds the handheld podcast microphone and keyboard. Both attach to the palm, with holding poses shared by the selector portraits and running model.
