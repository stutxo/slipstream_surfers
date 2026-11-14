// Handheld props share geometry and stay attached to the animated arm rig.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const charcoal = new THREE.MeshPhongMaterial({ color: '#20232a', shininess: 45 });
const foam = new THREE.MeshPhongMaterial({ color: '#353942', shininess: 7, specular: '#5f6269' });
const grille = new THREE.MeshPhongMaterial({ color: '#414650', shininess: 70 });
const metal = new THREE.MeshPhongMaterial({ color: '#9ba3ad', shininess: 115 });
const keycap = new THREE.MeshPhongMaterial({ color: '#e5e8ee', shininess: 38 });
const modifier = new THREE.MeshPhongMaterial({ color: '#687181', shininess: 42 });
const orange = new THREE.MeshPhongMaterial({ color: '#ff862b', shininess: 45 });

const micGrip = new THREE.CylinderGeometry(.032, .029, .14, 16);
const micBarrel = new THREE.CylinderGeometry(.088, .077, .17, 24);
const micWindscreen = new THREE.CapsuleGeometry(.096, .107, 8, 24);
const micCollar = new THREE.CylinderGeometry(.098, .095, .014, 24);
const micBase = new THREE.CylinderGeometry(.078, .073, .014, 24);
const micPivot = new THREE.CylinderGeometry(.023, .023, .019, 16).rotateZ(Math.PI / 2);
const deck = new RoundedBoxGeometry(.62, .24, .041, 3, .013);
const deckInset = new RoundedBoxGeometry(.592, .214, .008, 2, .009);

function mergePieces(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(pieces, false)!;
  pieces.forEach(piece => piece.dispose());
  return geometry;
}

// U-shaped suspension bracket around the lower barrel of the broadcast mic.
const micYokePath = [
  [-.115, .184], [-.115, .087], [-.100, .050], [-.068, .035],
  [0, .035], [.068, .035], [.100, .050], [.115, .087], [.115, .184],
].map(([x, y]) => new THREE.Vector3(x, y, 0));
const micYoke = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(micYokePath), 28, .0125, 8, false);

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
  // Hold the bracket below the microphone, with the windscreen angled toward the mouth.
  const assembly = new THREE.Group();
  assembly.position.z = -.052;
  assembly.rotation.z = -.21;
  microphone.add(assembly);
  mesh(assembly, micGrip, charcoal, 0, -.036);
  mesh(assembly, micYoke, metal);
  mesh(assembly, micBarrel, grille, 0, .157);
  mesh(assembly, micBase, charcoal, 0, .073);
  mesh(assembly, micWindscreen, foam, 0, .302);
  mesh(assembly, micCollar, metal, 0, .236);
  for (const side of [-1, 1]) {
    mesh(assembly, micPivot, grille, side * .109, .178);
  }
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
