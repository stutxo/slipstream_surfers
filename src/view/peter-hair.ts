import * as THREE from 'three';
import { drawLibreRelay } from './libre-relay';

const tau = 2 * Math.PI;
const crownHeight = .455;

// The front of Peter's head faces -Z. At the back the lower hem curves up
// into the opening above the adjustable strap.
function capSurface(angle: number, down: number) {
  const back = Math.abs(Math.PI - Math.abs(angle));
  const opening = .091 * Math.sqrt(Math.max(0, 1 - (back / .46) ** 2));
  const hem = .108 + .046 * Math.cos(angle);
  const polar = down * Math.acos(opening / (crownHeight - hem));
  const pucker = .010 * down ** 3 * Math.cos(18*angle + Math.sin(5*angle + 9*down));
  const radius = Math.sin(polar) ** .83 * (1 + pucker);
  return new THREE.Vector3(
    .337 * radius * Math.sin(angle),
    hem + (crownHeight - hem) * Math.cos(polar),
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

// A small repeating cotton twill tile, used by both crown and visor.
function twillTile() {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 128;
  const ctx = tile.getContext('2d')!;
  const pixels = ctx.createImageData(128,128);
  let seed = 119;
  for (let y=0; y<128; y++) for (let x=0; x<128; x++) {
    seed = (Math.imul(1664525,seed) + 1013904223) >>> 0;
    const ridge = Math.cos((x + y * .5) * Math.PI / 2);
    const fibre = (seed/4294967296 - .5) * 12;
    const fade = 2.5 * Math.sin(x * tau/128) * Math.cos(y * tau/128);
    const value = 7.5 * ridge + fibre + fade;
    const p = 4 * (y * 128 + x);
    pixels.data[p] = 118 + value; pixels.data[p+1] = 128 + value;
    pixels.data[p+2] = 174 + value; pixels.data[p+3] = 255;
  }
  ctx.putImageData(pixels,0,0);
  return tile;
}

function canvasMaterial(canvas: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({map,roughness:.96,side:THREE.DoubleSide});
}

function capFabrics() {
  const twill = twillTile();
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = ctx.createPattern(twill,'repeat')!;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const panelWidth = canvas.width / 6;
  for (let i = 0; i <= 6; i++) {
    const x = i * panelWidth;
    // Uneven dye is most visible in the cotton next to a panel seam.
    const wash = ctx.createRadialGradient(x,412,2,x,412,126);
    wash.addColorStop(0,'rgba(192,200,227,.20)');
    wash.addColorStop(1,'rgba(192,200,227,0)');
    ctx.fillStyle = wash; ctx.fillRect(x-126,286,252,226);
    const fold = ctx.createLinearGradient(x-23,0,x+23,0);
    fold.addColorStop(0,'rgba(189,195,223,0)');
    fold.addColorStop(.35,'rgba(189,195,223,.34)');
    fold.addColorStop(.49,'rgba(40,48,87,.44)');
    fold.addColorStop(.54,'rgba(204,207,230,.44)');
    fold.addColorStop(1,'rgba(189,195,223,0)');
    ctx.fillStyle = fold; ctx.fillRect(x-23,0,46,canvas.height);
    ctx.strokeStyle = 'rgba(201,207,234,.72)'; ctx.lineWidth = 1.6;
    ctx.setLineDash([5,5]); ctx.beginPath();
    for (const edge of [-6,6]) { ctx.moveTo(x+edge,0); ctx.lineTo(x+edge,canvas.height); }
    ctx.stroke(); ctx.setLineDash([]);
    if (i < 6) {
      const eye = x + panelWidth/2;
      ctx.save(); ctx.translate(eye,205); ctx.scale(1,.74);
      ctx.fillStyle = '#515f91'; ctx.beginPath(); ctx.ellipse(0,0,21,15,0,0,tau); ctx.fill();
      ctx.strokeStyle = '#96a1c9'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(0,0,17,12,0,0,tau); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#b2bad9';
      ctx.beginPath();
      for (let stitch=0; stitch<20; stitch++) {
        const angle = stitch*tau/20, dx = Math.cos(angle), dy = Math.sin(angle);
        ctx.moveTo(13*dx,8*dy); ctx.lineTo(20*dx,14*dy);
      }
      ctx.stroke(); ctx.restore();
    }
  }
  ctx.fillStyle = 'rgba(53,63,105,.38)'; ctx.fillRect(0,507,canvas.width,5);
  drawLibreRelay(ctx,824,375,400,69);

  const bill = document.createElement('canvas');
  bill.width=1024; bill.height=256;
  const b = bill.getContext('2d')!;
  const weave = b.createPattern(twill,'repeat')!;
  weave.setTransform(new DOMMatrix().scale(1.6,1.25));
  b.fillStyle = weave; b.fillRect(0,0,1024,256);
  b.fillStyle = 'rgba(173,182,214,.16)'; b.fillRect(0,0,1024,256);
  for (const y of [142,183,221]) {
    b.beginPath(); b.moveTo(0,y); b.lineTo(1024,y);
    b.setLineDash([]); b.lineWidth = 3.4; b.strokeStyle = 'rgba(71,80,122,.48)'; b.stroke();
    b.setLineDash([7,4]); b.lineWidth = 1.8; b.strokeStyle = 'rgba(212,216,234,.85)'; b.stroke();
  }
  return {crown:canvasMaterial(canvas), visor:canvasMaterial(bill)};
}

const trimMat = new THREE.MeshStandardMaterial({color:'#8390b9',roughness:.96,side:THREE.DoubleSide});
const liningMat = new THREE.MeshStandardMaterial({color:'#6f7ba8',roughness:.96,side:THREE.DoubleSide});
const buckleMat = new THREE.MeshPhongMaterial({color:'#77808b', specular:'#b2b9c7', shininess:58});
let fabric: ReturnType<typeof capFabrics> | undefined;

function brimSurface(u: number, depth: number) {
  const angle = (u - .5) * Math.PI;
  const width = Math.sin(angle), forward = Math.max(0, Math.cos(angle));
  const join = capSurface(width * 1.10, 1);
  // The crescent reaches farthest above the nose and curls down at the ears.
  return new THREE.Vector3(
    join.x + .088 * depth * width * forward,
    join.y + .006 - .010 * depth * forward - .036 * depth * width ** 2,
    join.z - depth * .216 * forward ** .62,
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
button.scale(1,.48,1); button.translate(0,crownHeight,.018);

export function addPeterHair(head: THREE.Group) {
  const hair = new THREE.Mesh(hairGeom,hairMat);
  hair.name = 'peter-cropped-hair';
  head.add(hair);
  const cap = new THREE.Group();
  cap.name = 'peter-baseball-cap';
  head.add(cap);
  fabric ??= capFabrics();
  cap.add(new THREE.Mesh(crown,fabric.crown), new THREE.Mesh(brim,fabric.visor),
    new THREE.Mesh(underBrim,liningMat), new THREE.Mesh(brimLip,trimMat),
    new THREE.Mesh(strap,trimMat), new THREE.Mesh(button,trimMat));

  const clasp = new THREE.Mesh(new THREE.BoxGeometry(.033,.044,.010), buckleMat);
  clasp.position.set(.063,.078,.301);
  clasp.rotation.y = .18;
  cap.add(clasp);
  cap.traverse(part => { part.castShadow = part.receiveShadow = true; });
}
