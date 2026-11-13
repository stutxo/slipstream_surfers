// Handheld props share geometry and stay attached to the animated arm rig.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const charcoal = new THREE.MeshPhongMaterial({ color: '#20232a', shininess: 45 });
const foam = new THREE.MeshPhongMaterial({ color: '#11141a', shininess: 8, specular: '#3c424a' });
const grille = new THREE.MeshPhongMaterial({ color: '#414650', shininess: 70 });
const metal = new THREE.MeshPhongMaterial({ color: '#9ba3ad', shininess: 115 });
const gold = new THREE.MeshPhongMaterial({ color: '#d1a744', shininess: 105 });
const keycap = new THREE.MeshPhongMaterial({ color: '#e5e8ee', shininess: 38 });
const modifier = new THREE.MeshPhongMaterial({ color: '#687181', shininess: 42 });
const orange = new THREE.MeshPhongMaterial({ color: '#ff862b', shininess: 45 });

const micHandle = new THREE.CylinderGeometry(.031, .026, .155, 14);
const micNeck = new THREE.CylinderGeometry(.037, .031, .045, 14);
const micCapsule = new THREE.CapsuleGeometry(.063, .105, 6, 16);
const micCollar = new THREE.CylinderGeometry(.040, .040, .014, 16);
const micBase = new THREE.CylinderGeometry(.030, .030, .012, 14);
const micBadge = new RoundedBoxGeometry(.036, .047, .009, 2, .005);
const micLed = new THREE.SphereGeometry(.007, 8, 6);
const deck = new RoundedBoxGeometry(.62, .24, .041, 3, .013);
const deckInset = new RoundedBoxGeometry(.592, .214, .008, 2, .009);

function mergePieces(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(pieces, false)!;
  pieces.forEach(piece => piece.dispose());
  return geometry;
}

// Shallow hoops make the microphone read as a mesh grille at preview scale.
const micGrille = mergePieces(Array.from({ length: 5 }, (_, index) => {
  const ring = new THREE.TorusGeometry(.0635, .0024, 4, 16);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, .121 + index * .023, -.065);
  return ring;
}));

const keyPieces: THREE.BufferGeometry[] = [];
const modifierPieces: THREE.BufferGeometry[] = [];
const accentPieces: THREE.BufferGeometry[] = [];
function makeKey(target: THREE.BufferGeometry[], x: number, y: number, width = .041) {
  const geometry = new RoundedBoxGeometry(width, .037, .018, 2, .004);
  geometry.translate(x, y, -.034);
  target.push(geometry);
}
for (let row = 0; row < 3; row++) {
  const count = 12 - row;
  for (let column = 0; column < count; column++) {
    const target = row === 0 && column === 0 ? accentPieces : keyPieces;
    makeKey(target, (column - (count - 1) / 2) * .047, .076 - row * .050);
  }
}
makeKey(modifierPieces, -.255, -.078);
makeKey(modifierPieces, -.207, -.078);
makeKey(keyPieces, -.018, -.078, .284);
makeKey(modifierPieces, .172, -.078);
makeKey(modifierPieces, .220, -.078);
makeKey(accentPieces, .268, -.078, .034);
const keys = mergePieces(keyPieces);
const modifiers = mergePieces(modifierPieces);
const accents = mergePieces(accentPieces);

function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
  x = 0, y = 0, z = 0): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(x, y, z);
  result.castShadow = true;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}

export function addPodcastMic(arm: THREE.Group): void {
  const microphone = new THREE.Group();
  microphone.name = 'ifd-podcast-mic';
  microphone.position.set(0, -.398, -.025);
  arm.add(microphone);
  // The palm wraps around the handle; the capsule rises above the thumb.
  mesh(microphone, micHandle, charcoal, 0, 0, -.065);
  mesh(microphone, micNeck, metal, 0, .084, -.065);
  mesh(microphone, micCapsule, foam, 0, .17, -.065);
  mesh(microphone, micCollar, gold, 0, .100, -.065);
  mesh(microphone, micBase, metal, 0, -.080, -.065);
  mesh(microphone, micGrille, grille);
  mesh(microphone, micBadge, charcoal, 0, .034, -.098);
  mesh(microphone, micLed, orange, 0, .045, -.105);
}

export function addKeyboard(arm: THREE.Group): void {
  const keyboard = new THREE.Group();
  keyboard.name = 'portland-keyboard';
  keyboard.position.set(0, -.398, -.025);
  arm.add(keyboard);
  // Grip the left portion of the case with its keys facing the camera (-Z).
  const body = new THREE.Group();
  body.position.set(.20, .012, -.075);
  keyboard.add(body);
  mesh(body, deck, charcoal);
  mesh(body, deckInset, grille, 0, 0, -.022);
  mesh(body, keys, keycap);
  mesh(body, modifiers, modifier);
  mesh(body, accents, orange);
}
