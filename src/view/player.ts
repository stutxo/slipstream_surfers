// The non-standard transaction: an original procedural mascot, animated from the upstream simulation.
// It keeps the original PlayerView interface so the lane/collision/camera foundation stays unchanged.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Sim } from '../sim/sim';
import type { SimEvent } from '../sim/types';
import { laneX } from '../config';
import { CHARACTERS, type CharacterId } from '../characters';
import { makeHuman, type RunnerParts } from './human';

type Clip = 'idle' | 'run' | 'jump' | 'jumpup' | 'fall' | 'roll' | 'die' | 'runlookback';
const WHITE = new THREE.MeshLambertMaterial({ color: '#fff9e9' });
const ORANGE = new THREE.MeshLambertMaterial({ color: '#ff8b25', emissive: '#572304' });
const EDGE = new THREE.MeshLambertMaterial({ color: '#ffb75a', emissive: '#632e06' });
const DARK = new THREE.MeshLambertMaterial({ color: '#10273a' });
const CYAN = new THREE.MeshBasicMaterial({ color: '#59efff', toneMapped: false });
const GOLD = new THREE.MeshLambertMaterial({ color: '#ffd459', emissive: '#66400b' });
const faceGeo = new THREE.SphereGeometry(1, 12, 8);
const bodyGeo = new RoundedBoxGeometry(0.94, 1.12, 0.48, 3, 0.12);
const footGeo = new RoundedBoxGeometry(0.31, 0.2, 0.47, 2, 0.06);

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function ellipse(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz = 0.04) {
  const m = mesh(parent, faceGeo, material, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

function labelTexture(back: boolean, baby = false) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);
  ctx.textAlign = 'center';
  if (back) {
    ctx.fillStyle = '#fff9e9';
    ctx.font = '900 218px Arial, sans-serif';
    // Explicit strokes keep the Bitcoin mark legible on browsers without a Bitcoin glyph.
    ctx.fillText('B', 256, 280);
    for (const x of [220, 258]) {
      ctx.fillRect(x, 104, 14, 38);
      ctx.fillRect(x, 268, 14, 34);
    }
    ctx.fillStyle = '#14283d';
    ctx.fillRect(46, 337, 420, 74);
    ctx.fillStyle = '#8ef7ff';
    ctx.font = '900 42px monospace';
    ctx.fillText(baby ? 'CHILD TX' : 'NONSTANDARD', 256, 389);
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.font = '700 24px monospace';
    ctx.fillText(baby ? 'CPFP' : 'SCRIPT TOO INTERESTING', 256, 458);
  } else {
    ctx.fillStyle = '#183047';
    ctx.font = '900 38px monospace';
    ctx.fillText('TX: 0x₿', 256, 61);
    ctx.strokeStyle = '#17314a';
    ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(208, 343); ctx.quadraticCurveTo(256, 391, 307, 343); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = '900 25px monospace';
    ctx.fillText('LET ME THROUGH', 256, 463);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false });
}
const labelMaterials: { front?: THREE.Material; back?: THREE.Material; child?: THREE.Material } = {};

type PacketParts = RunnerParts;

function makePacket(baby = false): PacketParts {
  const group = new THREE.Group();
  group.name = baby ? 'child-transaction' : 'nonstandard-transaction';
  const shell = new THREE.Group(); shell.position.y = 1.04; group.add(shell);
  mesh(shell, bodyGeo, ORANGE, 0, 0, 0);
  // A raised edge and a folded document corner make the silhouette a transaction rather than a crate.
  const edgeGeo = new RoundedBoxGeometry(1, 1.18, 0.17, 3, 0.1);
  mesh(shell, edgeGeo, EDGE, 0, 0, 0.04);
  const fold = mesh(shell, new THREE.ConeGeometry(0.14, 0.18, 3), WHITE, -0.36, 0.46, -0.275);
  fold.rotation.z = -Math.PI / 2;
  fold.rotation.x = Math.PI / 2;
  labelMaterials.front ||= labelTexture(false);
  labelMaterials.back ||= labelTexture(true);
  labelMaterials.child ||= labelTexture(true, true);
  const labelGeo = new THREE.PlaneGeometry(0.86, 1.02);
  const face = mesh(shell, labelGeo, labelMaterials.front, 0, 0, -0.252);
  face.rotation.y = Math.PI;
  mesh(shell, labelGeo, baby ? labelMaterials.child : labelMaterials.back, 0, 0, 0.252);
  const eyebrows: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    ellipse(shell, WHITE, side * 0.21, 0.12, -0.27, 0.16, 0.21);
    ellipse(shell, CYAN, side * 0.21, 0.11, -0.312, 0.095, 0.12, 0.025);
    ellipse(shell, DARK, side * 0.21, 0.11, -0.334, 0.042, 0.073, 0.02);
    ellipse(shell, WHITE, side * 0.21 + 0.025, 0.15, -0.352, 0.022, 0.028, 0.01);
    const brow = mesh(shell, new RoundedBoxGeometry(0.28, 0.065, 0.055, 2, 0.02), DARK, side * 0.21, 0.38, -0.28);
    brow.rotation.z = side * 0.12;
    brow.userData.restY = .38;
    eyebrows.push(brow);
    // Cyan eye accents keep the facial expression readable.
    const streak = mesh(shell, new THREE.BoxGeometry(0.12, 0.028, 0.035), CYAN, side * 0.39, 0.12, -0.285);
    streak.rotation.z = -side * 0.2;
  }
  const legs: THREE.Group[] = [], arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.23, 0.48, 0); group.add(leg);
    mesh(leg, new THREE.CapsuleGeometry(0.065, 0.19, 4, 8), DARK, 0, -0.17, 0);
    mesh(leg, footGeo, WHITE, 0, -0.37, -0.09);
    mesh(leg, new THREE.BoxGeometry(0.26, 0.04, 0.4), CYAN, 0, -0.46, -0.09);
    legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * 0.49, 1.25, 0); group.add(arm);
    arm.rotation.z = side * 0.24;
    mesh(arm, new THREE.CapsuleGeometry(0.065, 0.23, 4, 8), DARK, 0, -0.2, 0);
    ellipse(arm, WHITE, 0, -0.39, -0.03, 0.11, 0.13, 0.11);
    ellipse(arm, WHITE, -side * 0.09, -0.35, -0.055, 0.055, 0.07, 0.06);
    arms.push(arm);
  }
  return { group, shell, legs, arms, eyebrows };
}

export class PlayerView {
  root = new THREE.Group();
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions = {} as Record<Clip, THREE.AnimationAction>;
  current: Clip | null = null;
  character: CharacterId = 'transaction';
  private characters: Record<CharacterId, RunnerParts>;
  private portraits?: Record<CharacterId, string>;
  private packet: PacketParts;
  private child: PacketParts;
  private batch: PacketParts[];
  private helmet = new THREE.Group();
  private shield: THREE.Mesh;
  private board = new THREE.Group();
  private lean = 0;
  private leanV = 0;
  private yaw = 0;
  private yawV = 0;
  private squash = 0;
  private stumbleT = 0;
  private crashT = 0;
  private time = 0;
  private tiara: THREE.Object3D | undefined;

  constructor(_gltf: GLTF, scene: THREE.Scene) {
    this.characters = { transaction: makePacket(), portlandhodl: makeHuman('portlandhodl'), ifd: makeHuman('ifd'), 'peter-todd': makeHuman('peter-todd') };
    this.tiara = this.characters.ifd.group.getObjectByName('ifd-tiara');
    this.packet = this.characters.transaction;
    this.model = this.packet.group;
    this.root.name = 'transaction-runner';
    for (const [id, rig] of Object.entries(this.characters)) { rig.group.visible = id === this.character; this.root.add(rig.group); }
    scene.add(this.root);
    this.mixer = new THREE.AnimationMixer(this.model);
    // The helmet and its lamp are attached to the packet, and follow slide/lean animation.
    const dome = mesh(this.helmet, new THREE.SphereGeometry(0.53, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), GOLD, 0, 1.54, 0);
    dome.scale.set(1, 0.62, 0.7);
    const rim = mesh(this.helmet, new THREE.CylinderGeometry(0.56, 0.56, 0.075, 16), GOLD, 0, 1.55, 0);
    rim.scale.z = 0.72;
    const lamp = mesh(this.helmet, new THREE.CylinderGeometry(0.105, 0.105, 0.065, 12), DARK, 0, 1.73, -0.36);
    lamp.rotation.x = Math.PI / 2;
    ellipse(this.helmet, CYAN, 0, 1.73, -0.41, 0.08, 0.08, 0.025);
    this.model.add(this.helmet);
    this.shield = mesh(this.root, new THREE.TorusGeometry(0.94, 0.024, 6, 48), CYAN, 0, 0.9, 0);
    this.shield.rotation.x = Math.PI / 2;
    const deck = mesh(this.board, new RoundedBoxGeometry(0.8, 0.08, 1.45, 3, 0.17), DARK, 0, 0.06, 0);
    deck.rotation.y = 0.1;
    for (const side of [-1, 1]) mesh(this.board, new RoundedBoxGeometry(0.05, 0.07, 1.23, 2, 0.02), CYAN, side * 0.37, 0.065, 0);
    mesh(this.board, new THREE.BoxGeometry(0.16, 0.035, 0.7), CYAN, 0, 0.105, 0);
    this.root.add(this.board);
    this.child = makePacket(true);
    this.child.group.scale.setScalar(0.48);
    this.root.add(this.child.group);
    this.batch = [makePacket(true), makePacket(true)];
    for (const p of this.batch) {
      p.group.scale.setScalar(0.31);
      this.root.add(p.group);
    }
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.frustumCulled = false; });
    this.reset();
  }

  /** Models are allocated once and reused; appearance never changes simulation dimensions. */
  setCharacter(id: CharacterId) {
    if (this.character === id) return;
    this.mixer.stopAllAction();
    this.character = id;
    this.packet = this.characters[id];
    for (const [key, rig] of Object.entries(this.characters)) rig.group.visible = key === id;
    this.model = this.packet.group;
    this.model.add(this.helmet);
    this.helmet.position.y = id === 'transaction' ? 0 : .17;
    this.helmet.scale.setScalar(id === 'transaction' ? 1 : .84);
    // Scaling the original helmet also scales its local height; compensate at the attachment.
    if (id !== 'transaction') this.helmet.position.y += .25;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.reset();
  }

  /** A selector portrait is the actual game model, rendered off-screen only once. */
  createPortraits(renderer: THREE.WebGLRenderer): Record<CharacterId, string> {
    if (this.portraits) return this.portraits;
    const size = 160;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5d6a7a, 2.1));
    const key = new THREE.DirectionalLight(0xffe0bc, 2.7); key.position.set(-3, 5, -4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9adfff, 1.8); rim.position.set(3, 2, 2); scene.add(rim);
    const camera = new THREE.PerspectiveCamera(33, 1, .1, 10);
    camera.position.set(-.38, 1.5, -2.55); camera.lookAt(0, 1.25, 0);
    const target = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const oldTarget = renderer.getRenderTarget(), oldColor = renderer.getClearColor(new THREE.Color());
    const oldAlpha = renderer.getClearAlpha(), oldAutoClear = renderer.autoClear;
    const pixels = new Uint8Array(size * size * 4);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const data = ctx.createImageData(size, size);
    const portraits = {} as Record<CharacterId, string>;
    const helmetVisible = this.helmet.visible; this.helmet.visible = false;
    try {
      renderer.autoClear = true;
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(target);
      for (const { id } of CHARACTERS) {
        const rig = this.characters[id], model = rig.group;
        const parent = model.parent, visible = model.visible;
        const position = model.position.clone(), rotation = model.quaternion.clone(), scale = model.scale.clone();
        const shellRotation = rig.shell.quaternion.clone();
        const armRotations = rig.arms.map(a => a.quaternion.clone());
        const legRotations = rig.legs.map(a => a.quaternion.clone());
        const propRotation = rig.heldProp?.object.quaternion.clone();
        try {
          scene.add(model); model.visible = true; model.position.set(0,0,0); model.rotation.set(0,0,0); model.scale.set(1,1,1);
          rig.shell.rotation.set(0,0,0); this.pose(rig,0,false);
          if (id === 'transaction') { camera.position.set(-.36,1.27,-2.65); camera.lookAt(0,1.0,0); }
          else if (id === 'ifd') { camera.position.set(-.38,1.62,-2.75); camera.lookAt(0,1.34,0); }
          else { camera.position.set(-.38,1.5,-2.55); camera.lookAt(0,1.25,0); }
          renderer.render(scene,camera);
          renderer.readRenderTargetPixels(target,0,0,size,size,pixels);
          for (let y=0;y<size;y++) data.data.set(pixels.subarray((size-y-1)*size*4,(size-y)*size*4),y*size*4);
          ctx.putImageData(data,0,0); portraits[id]=canvas.toDataURL('image/png');
        } finally {
          scene.remove(model); if(parent) parent.add(model);
          model.visible=visible; model.position.copy(position); model.quaternion.copy(rotation); model.scale.copy(scale);
          rig.shell.quaternion.copy(shellRotation);
          rig.arms.forEach((a,i)=>a.quaternion.copy(armRotations[i]));
          rig.legs.forEach((a,i)=>a.quaternion.copy(legRotations[i]));
          if(rig.heldProp && propRotation) rig.heldProp.object.quaternion.copy(propRotation);
        }
      }
    } finally {
      this.helmet.visible = helmetVisible;
      renderer.setRenderTarget(oldTarget); renderer.setClearColor(oldColor,oldAlpha); renderer.autoClear=oldAutoClear;
      target.dispose();
    }
    this.portraits = portraits;
    return portraits;
  }

  private spring(dt: number, target: number, k: 'lean' | 'yaw', kv: 'leanV' | 'yawV', stiff: number, damp: number) {
    const c = 2 * Math.sqrt(stiff) * damp;
    let t = Math.min(dt, 0.05);
    while (t > 0) {
      const h = Math.min(t, 1 / 120);
      this[kv] += (stiff * (target - this[k]) - c * this[kv]) * h;
      this[k] += this[kv] * h;
      t -= h;
    }
  }

  play(name: Clip, _fade = 0.12, _timeScale = 1) { this.current = name; }

  reset() {
    this.mixer.stopAllAction();
    this.current = null;
    this.lean = this.leanV = this.yaw = this.yawV = this.squash = this.stumbleT = this.crashT = 0;
    this.root.scale.set(1, 1, 1);
    this.root.rotation.set(0, 0, 0);
    this.root.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.position.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);
    this.packet.shell.rotation.set(0, 0, 0);
    this.helmet.visible = this.shield.visible = this.board.visible = this.child.group.visible = false;
    if(this.tiara) this.tiara.visible = true;
    for (const p of this.batch) p.group.visible = false;
  }

  private pose(parts: PacketParts, phase: number, running: boolean, air = false) {
    parts.legs.forEach((leg, i) => {
      const cycle = phase + i * Math.PI;
      leg.rotation.x = air ? (i ? -0.6 : 0.8) : (running ? Math.sin(cycle) * 0.9 : Math.sin(cycle) * 0.03);
    });
    parts.arms.forEach((arm, i) => {
      const side = i ? 1 : -1;
      arm.rotation.x = air ? -0.7 : (running ? -Math.sin(phase + i * Math.PI) * 0.8 : 0);
      arm.rotation.z = side * (air ? 1.0 : 0.24 + Math.sin(phase * 0.5) * 0.05);
    });
    this.poseHeldProp(parts, phase, running, air);
  }

  private poseHeldProp(parts: RunnerParts, phase: number, running: boolean, air = false) {
    const prop = parts.heldProp;
    if(!prop) return;
    const arm = parts.arms[prop.arm];
    const bounce = Math.sin(phase) * (running ? .07 : .025);
    if (prop.kind === 'microphone') {
      // Lift the mic beside her shoulder, clear of her black outfit and her face.
      arm.rotation.set(1.04, 0, -.62 + bounce);
    } else {
      arm.rotation.set(.65, 0, .12 + bounce + (air ? .12 : 0));
    }
    // Keep the mic upright and keyboard level while the palm follows the arm.
    prop.object.quaternion.copy(arm.quaternion).invert();
  }

  menu(dt: number) {
    this.time += dt;
    this.current = 'idle';
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, Math.sin(this.time * 0.65) * 0.2, 0);
    this.model.position.y = Math.sin(this.time * 2.4) * 0.045;
    this.pose(this.packet, this.time * 2, false);
    const wavingArm = this.packet.heldProp?.arm === 1 ? 0 : 1;
    this.packet.arms[wavingArm].rotation.z = (wavingArm ? 1 : -1) * (2.2 + Math.sin(this.time * 3) * 0.18);
    this.packet.arms[wavingArm].rotation.x = -0.2;
    this.packet.eyebrows.forEach((b,i) => { b.rotation.z=(i ? 1 : -1)*(.12 + Math.sin(this.time*.8)*.04); b.position.y=Number(b.userData.restY)+(i ? .025 : 0); });
  }

  update(sim: Sim, dt: number, events: SimEvent[]) {
    this.time += dt;
    for (const e of events) {
      if (e.type === 'land') this.squash = Math.min(0.22, 0.07 + e.fall * 0.04);
      if (e.type === 'stumble') this.stumbleT = 0.6;
      if (e.type === 'crash') this.crashT = 0.001;
    }
    this.stumbleT = Math.max(0, this.stumbleT - dt);
    if (!sim.alive) this.crashT = Math.min(0.6, this.crashT + dt);
    const toGo = laneX(sim.lane) - sim.x;
    const dir = sim.alive && Math.abs(toGo) > 0.25 ? Math.sign(toGo) : 0;
    this.spring(dt, dir * (sim.grounded ? 1 : 0.6), 'lean', 'leanV', 700, 0.7);
    this.spring(dt, dir * 0.34, 'yaw', 'yawV', 1000, 0.62);
    this.squash = Math.max(0, this.squash - dt * 1.4);
    this.current = !sim.alive ? 'die' : sim.sliding ? 'roll' : !sim.grounded ? 'jump' : 'run';
    const p = sim.power as Record<string, number>;
    const slipstream = p.slipstream > 0;
    const phase = this.time * (12 + sim.speed * 0.6);
    this.pose(this.packet, phase, sim.alive && sim.grounded && !sim.sliding && !slipstream, !sim.grounded);
    this.root.position.set(sim.x, sim.y, 0);
    this.root.rotation.set(0, 0, -this.lean * 0.2);
    this.root.scale.set(1, 1, 1);
    this.model.rotation.y = -this.yaw + (this.stumbleT > 0 ? Math.sin(this.stumbleT * 9) * 0.55 : 0);
    this.model.rotation.x = sim.sliding ? -0.3 : slipstream ? 0.1 : -0.07;
    this.model.rotation.z = !sim.alive ? Math.min(1.35, this.crashT * 2.6) : 0;
    const bob = sim.grounded && sim.alive && !sim.sliding ? Math.abs(Math.sin(phase)) * 0.075 : 0;
    this.model.position.y = bob + (slipstream ? 0.09 : 0);
    const sq = this.squash;
    this.model.scale.set(1 + sq * 0.5 + (sim.sliding ? 0.12 : 0), sim.sliding ? 0.43 : 1 - sq, 1 + sq * 0.5);
    this.packet.shell.rotation.z = Math.sin(phase) * (sim.grounded && sim.alive ? 0.025 : 0);
    this.packet.eyebrows.forEach((b, i) => { b.position.y = Number(b.userData.restY); b.rotation.z = (i ? 1 : -1) * (this.stumbleT > 0 ? -0.25 : 0.12); });
    this.helmet.visible = p.helmet > 0;
    this.shield.visible = p.helmet > 0 || sim.slipstreamExitGrace > 0;
    if(this.tiara) this.tiara.visible = !(this.character === 'ifd' && p.helmet > 0);
    this.shield.rotation.z = this.time;
    this.shield.position.y = 0.75 + Math.sin(this.time * 3) * 0.1;
    this.shield.scale.setScalar(1 + Math.sin(this.time * 4) * 0.035);
    this.board.visible = slipstream;
    this.board.rotation.z = -this.lean * 0.1;
    if (slipstream) {
      this.packet.legs[0].rotation.x = 0.2; this.packet.legs[1].rotation.x = -0.2;
      this.packet.arms[0].rotation.z = -0.7; this.packet.arms[1].rotation.z = 0.7;
      this.poseHeldProp(this.packet, phase, false);
    }
    this.child.group.visible = p.cpfp > 0;
    this.child.group.position.set(Math.sin(this.time * 5) * 0.08, 0, 0.7);
    this.child.group.rotation.x = -0.28;
    this.pose(this.child, phase * 1.25, true);
    this.child.arms.forEach((arm) => { arm.rotation.x = -1.3; });
    this.batch.forEach((baby, i) => {
      baby.group.visible = p.double > 0;
      const side = i ? 1 : -1;
      baby.group.position.set(side * (0.82 + Math.sin(this.time * 3 + i) * 0.1), 0.12 + Math.sin(this.time * 4 + i) * 0.09, 0.5 + i * 0.3);
      this.pose(baby, phase + i * Math.PI, true);
    });
  }
}
