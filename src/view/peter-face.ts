import * as THREE from 'three';

type Point = [number, number, number];

// Half-contours from the middle of the chin around to the ear. Mirroring
// each one gives the beard a continuous front, jawline and turned-under edge.
function contour(points: Point[]) {
  const right = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const left = right.slice(1).reverse().map(p => new THREE.Vector3(-p.x, p.y, p.z));
  return new THREE.CatmullRomCurve3([...left, ...right]);
}

const cheek = contour([
  [0,-.189,-.266], [.060,-.190,-.259], [.111,-.154,-.245], [.162,-.141,-.219],
  [.221,-.116,-.183], [.266,-.078,-.132], [.293,-.057,-.084],
  [.305,-.013,-.063], [.310,.041,-.048],
]);
const jaw = contour([
  [0,-.253,-.272], [.071,-.252,-.261], [.135,-.235,-.239], [.183,-.217,-.206],
  [.228,-.176,-.170], [.266,-.134,-.120], [.290,-.104,-.073],
  [.301,-.081,-.040], [.306,-.071,-.021],
]);
const edge = contour([
  [0,-.368,-.160], [.059,-.362,-.158], [.113,-.347,-.145], [.164,-.320,-.127],
  [.207,-.282,-.104], [.244,-.234,-.080], [.270,-.191,-.046],
  [.287,-.152,-.021], [.296,-.120,.008],
]);
const throat = contour([
  [0,-.379,-.071], [.050,-.372,-.068], [.100,-.349,-.061], [.144,-.312,-.042],
  [.186,-.272,-.018], [.221,-.224,.010], [.249,-.184,.033],
  [.271,-.150,.044], [.289,-.120,.036],
]);

// Small, irregular strokes resolve into a softer band of stubble in the
// selection portrait. A few longer strokes cross the upper cheek line.
function beardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 224;
  const ctx = canvas.getContext('2d')!;
  let state = 704;
  const random = () => ((state = Math.imul(state, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
  const density = ctx.createLinearGradient(0, 0, 0, 75);
  density.addColorStop(0, 'rgba(255,255,255,0)');
  density.addColorStop(.25, 'rgba(255,255,255,.12)');
  density.addColorStop(.66, 'rgba(255,255,255,.74)');
  density.addColorStop(1, '#fff');
  ctx.fillStyle = density;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  for (let i = 0; i < 16000; i++) {
    const x = random() * canvas.width, y = random() * canvas.height;
    const chin = Math.sin(Math.PI * x / canvas.width);
    const dx = (1.4 + random() * 3.3) * Math.cos(Math.PI * x / canvas.width) + (random() - .5) * 3;
    const dy = 1.2 + random() * (2.6 + chin * 2.1);
    ctx.strokeStyle = random() < .24 ? 'rgba(246,231,214,.58)' : 'rgba(73,60,58,.49)';
    ctx.lineWidth = .65 + random() * .85;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + dx * .25, y + dy * .52, x + dx, y + dy);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const beardMaterial = new THREE.MeshPhongMaterial({
  vertexColors: true, side: THREE.DoubleSide, shininess: 6, specular: '#201a18', alphaTest: .48,
});
const umber = new THREE.Color('#503f3a'), chestnut = new THREE.Color('#826556');
const cheekHairs = new THREE.Color('#bc9078');

function makeBeard() {
  const columns = 108, rows = 18;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], uvs: number[] = [];
  const p = new THREE.Vector3(), color = new THREE.Color();
  const smooth = THREE.MathUtils.smoothstep;
  for (let i = 0; i <= columns; i++) {
    const u = i / columns;
    const top = cheek.getPoint(u), middle = jaw.getPoint(u);
    const bottom = edge.getPoint(u), inside = throat.getPoint(u);
    const section = new THREE.CatmullRomCurve3([top, middle, bottom, inside]);
    const chin = 1 - smooth(Math.abs(top.x), .10, .29);
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      section.getPoint(v, p);
      if (v < .65) {
        const surface = Math.sqrt(Math.max(0, 1 - (p.y / .355) ** 2));
        const radius = Math.hypot(p.x / .315, p.z / .27);
        const scale = Math.max(1, (surface + .006) / radius);
        p.x *= scale; p.z *= scale;
      }
      // Gentle surface variation catches light along the close-clipped chin.
      const flow = u * 2 * Math.PI + .052 * v * Math.sin(u * 14);
      const clump = .52 * Math.sin(34 * flow) + .31 * Math.cos(19 * flow + .5) + .17 * Math.sin(47 * flow);
      const relief = (.0006 + .0012 * chin) * clump * Math.sin(Math.PI * v);
      p.x += Math.sign(p.x) * relief * .55;
      p.z -= relief;
      p.y -= chin * clump * .0025 * Math.exp(-((v - .67) ** 2) / .013);
      positions.push(p.x, p.y, p.z);
      uvs.push(u, 1 - v);
      const stubble = (1 - smooth(v, .03, .34 + .19 * (1 - chin))) * (.39 + .46 * (1 - chin));
      color.copy(umber).lerp(chestnut, .32 + .13 * clump + .10 * (1 - chin))
        .lerp(cheekHairs, stubble);
      colors.push(color.r, color.g, color.b);
      if (i && j) {
        const d = i * (rows + 1) + j, a = d - rows - 2;
        indices.push(a, d - 1, d, a, d, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Short hairs sit directly on the upper lip, with the skin visible between them.
function upperLipTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  let seed = 935;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4100; i++) {
    const x = random() * 256, y = random() * 64, u = x / 128 - 1, v = y / 64;
    const blend = (1 - u * u) * Math.sin(v * Math.PI) * (1 - .31 * Math.exp(-u * u / .022));
    if (random() > blend) continue;
    ctx.strokeStyle = random() < .22 ? 'rgba(149,123,102,.55)' : 'rgba(81,62,53,.78)';
    ctx.lineWidth = .9 + random() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + u * (1 + random() * 2.5), y + 2 + random() * 4.5);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
function makeMoustache() {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24, x = .235 * (u - .5), side = Math.abs(2 * u - 1);
    const upper = -.090 - .026 * side ** 1.5, lower = -.135 - .008 * side;
    for (let j = 0; j <= 4; j++) {
      const v = j / 4, y = THREE.MathUtils.lerp(upper, lower, v);
      const cheekZ = -.27 * Math.sqrt(Math.max(0, 1 - (x / .315) ** 2 - (y / .355) ** 2));
      const jawZ = -.065 - .20 * Math.sqrt(Math.max(0, 1 - (x / .235) ** 2 - ((y + .21) / .16) ** 2));
      const depth = Math.min(cheekZ, jawZ) - .0017;
      positions.push(x, y, depth);
      uvs.push(u, 1 - v);
      if (i && j) {
        const n = i * 5 + j;
        indices.push(n - 6, n - 1, n, n - 6, n, n - 5);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhongMaterial({
    map: upperLipTexture(), transparent: true, depthWrite: false, shininess: 2, specular: '#161211',
  });
  return new THREE.Mesh(geometry, material);
}

export function addPeterBeard(head: THREE.Group) {
  beardMaterial.map ??= beardTexture();
  const beard = new THREE.Mesh(makeBeard(), beardMaterial);
  beard.name = 'peter-jaw-beard';
  beard.castShadow = true;
  beard.receiveShadow = true;
  head.add(beard, makeMoustache());
}

// Round the underside towards the septum, then lift the two outer wings.
export function addPeterNose(head: THREE.Group, skin: THREE.Material) {
  const profile = [
    [0, -.078, -.262], [.019, -.088, -.277], [.035, -.081, -.289],
    [.045, -.065, -.298], [.042, -.047, -.296], [.033, -.010, -.284],
    [.031, .035, -.274], [.027, .073, -.262], [0, .106, -.255],
  ];
  const section = new THREE.CatmullRomCurve3(profile.map(p => new THREE.Vector3(...p)));
  const rings = 32, sides = 40;
  const samples = section.getPoints(rings);
  const geometry = new THREE.LatheGeometry(samples.map(p => new THREE.Vector2(p.x, p.y)), sides);
  const positions = geometry.attributes.position, colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const center = samples[i % samples.length];
    const x = positions.getX(i), z = positions.getZ(i);
    const front = Math.max(0, -z / Math.max(.0001, center.x));
    const side = Math.abs(x) / Math.max(.0001, center.x);
    const lower = Math.exp(-(((center.y + .071) / .023) ** 2));
    const wing = Math.exp(-(((side - .80) / .22) ** 2)) * lower;
    positions.setY(i, center.y + lower * (.008 * side * side - .009 * front * front));
    positions.setZ(i, center.z + .85 * z - front * lower * .007 - wing * .004);
    const nostril = Math.exp(-(((Math.abs(x) - .027) / .008) ** 2 + ((center.y + .079) / .006) ** 2)) * front;
    const shade = 1 - .69 * nostril;
    colors.push(shade, shade, shade);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const shadedSkin = skin.clone(); shadedSkin.vertexColors = true;
  head.add(new THREE.Mesh(geometry, shadedSkin));
}
