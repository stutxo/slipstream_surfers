import * as THREE from 'three';

const tau = 2 * Math.PI;

// The front of Peter's head faces -Z. At the back the lower hem curves up
// into the opening above the adjustable strap.
function capSurface(angle: number, down: number) {
  const back = Math.abs(Math.PI - Math.abs(angle));
  const opening = .091 * Math.sqrt(Math.max(0, 1 - (back / .46) ** 2));
  const hem = .113 + .053 * Math.cos(angle);
  const polar = down * Math.acos(opening / (.434 - hem));
  const radius = Math.sin(polar) ** .83;
  return new THREE.Vector3(
    .337 * radius * Math.sin(angle),
    hem + (.434 - hem) * Math.cos(polar),
    -.302 * radius * Math.cos(angle) + .018 * (1 - radius),
  );
}

function grid(columns: number, rows: number, sample: (u: number, v: number) => THREE.Vector3) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const u = i / columns, v = j / rows;
      const point = sample(u, v);
      positions.push(point.x, point.y, point.z);
      uvs.push(1 - u, 1 - v);
      if (i && j) {
        const end = j * (columns + 1) + i;
        indices.push(end - columns - 2, end - columns - 1, end - 1, end - columns - 1, end, end - 1);
      }
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function capFabric() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#242842';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const panelWidth = canvas.width / 6;
  for (let i = 0; i <= 6; i++) {
    const x = i * panelWidth;
    ctx.fillStyle = 'rgba(83,92,124,.38)';
    ctx.fillRect(x-1, 0, 2, 256);
    ctx.fillStyle = 'rgba(141,146,177,.32)';
    for (let y = 0; y < 256; y += 6) {
      ctx.fillRect(x-3, y, .9, 3);
      ctx.fillRect(x+2, y, .9, 3);
    }
  }
  ctx.fillStyle = '#343951';
  ctx.fillRect(0,248,1024,8);
  ctx.fillStyle = '#dad9e2';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 29px Georgia, serif';
  ctx.fillText('mempool',512,186);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshPhongMaterial({
    map, shininess: 10, specular: '#222437', side: THREE.DoubleSide,
  });
}

const visorMat = new THREE.MeshPhongMaterial({color:'#292d48', specular:'#25273c', shininess:11, side:THREE.DoubleSide});
const edgeMat = new THREE.MeshPhongMaterial({color:'#414660', specular:'#252638', shininess:12, side:THREE.DoubleSide});
const liningMat = new THREE.MeshPhongMaterial({color:'#171a30', shininess:6, side:THREE.DoubleSide});
const buckleMat = new THREE.MeshPhongMaterial({color:'#77808b', specular:'#b2b9c7', shininess:58});
let crownMat: THREE.Material | undefined;

function brimSurface(u: number, depth: number) {
  const angle = (u - .5) * Math.PI;
  const width = Math.sin(angle), forward = Math.max(0, Math.cos(angle));
  const join = capSurface(width * 1.10, 1);
  // The crescent reaches farthest above the nose and curls down at the ears.
  return new THREE.Vector3(
    join.x + .056 * depth * width * forward,
    join.y + .006 + .047 * depth * forward - .026 * depth * width ** 2,
    join.z - depth * .215 * forward ** .76,
  );
}

function closeCut() {
  const geometry = grid(96, 18, (u, v) => {
    const angle = (u - .5) * tau;
    const temple = Math.exp(-(((Math.abs(angle) - 1.25) / .14) ** 2));
    const edge = .076 + .157 * Math.cos(angle) - .061 * temple
      + .007 * Math.sin(13 * angle) + .003 * Math.sin(31 * angle);
    const polar = v * Math.acos(edge / .364);
    return new THREE.Vector3(.320 * Math.sin(polar) * Math.sin(angle), .364 * Math.cos(polar),
      -.277 * Math.sin(polar) * Math.cos(angle));
  });
  const warm = new THREE.Color('#604c42'), dark = new THREE.Color('#382d2b');
  const colors: number[] = [], shade = new THREE.Color();
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const flow = uv.getX(i) * tau + .12 * Math.sin(3 * uv.getY(i));
    const variation = .42 + .16 * Math.sin(flow * 21) + .16 * Math.sin(flow * 43 + 1);
    shade.copy(dark).lerp(warm, variation).toArray(colors, colors.length);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  return geometry;
}

const hairGeom = closeCut();
const hairMat = new THREE.MeshPhongMaterial({vertexColors:true, specular:'#221d19', shininess:7});
const crown = grid(72, 20, (u,v) => capSurface((u - .5) * tau, v));
const brim = grid(40, 8, brimSurface);
const underBrim = brim.clone().translate(0,-.012,0);
const brimLip = grid(40,1,(u,v) => {
  const p = brimSurface(u,1);
  p.y -= .012 * v;
  return p;
});
const strap = grid(20,1,(u,v) => {
  const angle = Math.PI + (u - .5) * 1.1;
  return new THREE.Vector3(.338 * Math.sin(angle), .060 + .035 * (1-v), -.303 * Math.cos(angle));
});
const button = new THREE.SphereGeometry(.024,12,8);
button.scale(1,.48,1); button.translate(0,.434,.018);

export function addPeterHair(head: THREE.Group) {
  const hair = new THREE.Mesh(hairGeom,hairMat);
  hair.name = 'peter-cropped-hair';
  head.add(hair);
  const cap = new THREE.Group();
  cap.name = 'peter-baseball-cap';
  head.add(cap);
  crownMat ??= capFabric();
  cap.add(new THREE.Mesh(crown,crownMat), new THREE.Mesh(brim,visorMat),
    new THREE.Mesh(underBrim,liningMat), new THREE.Mesh(brimLip,edgeMat),
    new THREE.Mesh(strap,visorMat), new THREE.Mesh(button,visorMat));

  const clasp = new THREE.Mesh(new THREE.BoxGeometry(.033,.044,.010), buckleMat);
  clasp.position.set(.063,.078,.301);
  clasp.rotation.y = .18;
  cap.add(clasp);
  cap.traverse(part => { part.castShadow = part.receiveShadow = true; });
}
