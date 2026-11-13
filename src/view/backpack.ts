// Peter's hiking pack: straps wrap over the shoulders and return around the ribs.
// The front stays a red T-shirt; no straps or clips attach to the trousers.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const fabric = new THREE.MeshPhongMaterial({ color: '#424e57', shininess: 14 });
const pocketFabric = new THREE.MeshPhongMaterial({ color: '#34414b', shininess: 13 });
const padding = new THREE.MeshPhongMaterial({ color: '#62707a', shininess: 18 });
const piping = new THREE.MeshPhongMaterial({ color: '#8d9ba3', shininess: 25 });
const webbing = new THREE.MeshPhongMaterial({ color: '#202c35', shininess: 10 });
const metal = new THREE.MeshPhongMaterial({ color: '#c2c9cb', shininess: 75 });

function add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, name: string) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

function box(parent: THREE.Object3D, material: THREE.Material, name: string,
  x: number, y: number, z: number, w: number, h: number, d: number, radius: number) {
  const mesh = add(parent, new RoundedBoxGeometry(w, h, d, 3, radius), material, name);
  mesh.position.set(x, y, z);
  return mesh;
}

function cord(parent: THREE.Object3D, material: THREE.Material, name: string, points: THREE.Vector3[], radius: number) {
  const curve = new THREE.CatmullRomCurve3(points);
  return add(parent, new THREE.TubeGeometry(curve, 24, radius, 6, false), material, name);
}

/** A rounded, flattened cross-section makes shoulder padding read as a strap, not a rope. */
function paddedStrap(parent: THREE.Object3D, side: number) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * .215, .235, .205), // upper rear anchor
    new THREE.Vector3(side * .235, .30, .045), // over the shoulder
    new THREE.Vector3(side * .228, .225, -.16),
    new THREE.Vector3(side * .25, .105, -.188), // short padded section on upper chest
    new THREE.Vector3(side * .31, .005, -.115), // bends outward below the arm
    new THREE.Vector3(side * .325, -.095, .025),
    new THREE.Vector3(side * .255, -.165, .21), // returns to the bag, not the waist
  ]);
  const segments = 30, sides = 8;
  const positions: number[] = [], indices: number[] = [];
  const widthAxis = new THREE.Vector3(), depthAxis = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, centre = curve.getPoint(t), tangent = curve.getTangent(t);
    widthAxis.set(1, 0, 0).addScaledVector(tangent, -tangent.x).normalize();
    depthAxis.crossVectors(tangent, widthAxis).normalize();
    const taper = .72 + .28 * Math.sin(Math.PI * t);
    for (let j = 0; j < sides; j++) {
      const angle = j / sides * Math.PI * 2;
      const vertex = centre.clone()
        .addScaledVector(widthAxis, Math.cos(angle) * .048 * taper)
        .addScaledVector(depthAxis, Math.sin(angle) * .019);
      positions.push(vertex.x, vertex.y, vertex.z);
      if (i < segments) {
        const a = i * sides + j, b = i * sides + (j + 1) % sides;
        indices.push(a, b, a + sides, b, b + sides, a + sides);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  add(parent, geometry, padding, side < 0 ? 'backpack-left-shoulder-loop' : 'backpack-right-shoulder-loop');
}

export function addBackpack(parent: THREE.Group): { badgeY: number; badgeZ: number } {
  const pack = new THREE.Group();
  pack.name = 'peter-hiking-backpack';
  parent.add(pack);

  // A full, rounded pack projects beyond the shirt on both sides and above the shoulders.
  box(pack, webbing, 'backpack-contact-padding', 0, .005, .183, .47, .54, .10, .07);
  box(pack, fabric, 'backpack-main-compartment', 0, .005, .295, .60, .62, .29, .11);
  box(pack, pocketFabric, 'backpack-front-pocket', 0, -.18, .445, .43, .19, .075, .055);
  box(pack, piping, 'backpack-pocket-zipper', 0, -.105, .489, .31, .012, .009, .004);
  const zipper = box(pack, metal, 'backpack-zipper-pull', .115, -.125, .498, .018, .037, .009, .005);
  zipper.rotation.z = -.18;

  // Outer stitching, side pockets and a carry loop make the back silhouette unmistakable.
  cord(pack, piping, 'backpack-main-seam', [
    new THREE.Vector3(-.235, -.20, .42), new THREE.Vector3(-.26, .13, .415),
    new THREE.Vector3(-.18, .265, .415), new THREE.Vector3(0, .285, .415),
    new THREE.Vector3(.18, .265, .415), new THREE.Vector3(.26, .13, .415),
    new THREE.Vector3(.235, -.20, .42),
  ], .008);
  for (const side of [-1, 1]) {
    box(pack, pocketFabric, `backpack-side-pocket-${side}`, side * .303, -.16, .29, .11, .24, .19, .045);
    box(pack, piping, `backpack-side-pocket-rim-${side}`, side * .31, -.06, .29, .115, .018, .17, .008);
    paddedStrap(pack, side);
  }
  cord(pack, webbing, 'backpack-top-carry-loop', [
    new THREE.Vector3(-.085, .29, .25), new THREE.Vector3(-.075, .385, .25),
    new THREE.Vector3(.075, .385, .25), new THREE.Vector3(.085, .29, .25),
  ], .018);

  // The existing Bitcoin patch belongs on the upper main compartment above the pocket.
  return { badgeY: .085, badgeZ: .447 };
}
