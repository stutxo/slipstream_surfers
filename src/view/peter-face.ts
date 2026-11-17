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
  [0,-.163,-.260], [.050,-.173,-.259], [.11,-.142,-.254], [.161,-.140,-.232],
  [.219,-.117,-.198], [.266,-.085,-.14], [.291,-.038,-.099],
  [.302,.025,-.077], [.309,.071,-.054],
]);
const jaw = contour([
  [0,-.27,-.291], [.076,-.27,-.278], [.136,-.252,-.253], [.183,-.22,-.223],
  [.227,-.183,-.183], [.267,-.145,-.125], [.289,-.117,-.073],
  [.301,-.077,-.049], [.308,-.059,-.029],
]);
const edge = contour([
  [0,-.417,-.245], [.057,-.414,-.239], [.112,-.394,-.217], [.162,-.347,-.18],
  [.201,-.306,-.141], [.238,-.259,-.094], [.263,-.211,-.051],
  [.281,-.173,-.010], [.284,-.145,.022],
]);
const throat = contour([
  [0,-.369,-.112], [.049,-.36,-.113], [.094,-.342,-.093], [.133,-.305,-.053],
  [.165,-.267,-.023], [.194,-.221,.014], [.215,-.186,.043],
  [.233,-.163,.061], [.253,-.141,.061],
]);

// Small, irregular strokes resolve into a softer band of stubble in the
// selection portrait. A few longer strokes cross the upper cheek line.
function beardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 224;
  const ctx = canvas.getContext('2d')!;
  let state = 704;
  const random = () => ((state = Math.imul(state, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
  const density = ctx.createLinearGradient(0, 0, 0, 35);
  density.addColorStop(0, 'rgba(255,255,255,0)');
  density.addColorStop(.45, 'rgba(255,255,255,.68)');
  density.addColorStop(1, '#fff');
  ctx.fillStyle = density;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  for (let i = 0; i < 16000; i++) {
    const x = random() * canvas.width, y = random() * canvas.height;
    const chin = Math.sin(Math.PI * x / canvas.width);
    const dx = (1.4 + random() * 3.3) * Math.cos(Math.PI * x / canvas.width) + (random() - .5) * 3;
    const dy = 1.8 + random() * (3.5 + chin * 5);
    ctx.strokeStyle = random() < .28 ? 'rgba(255,236,211,.65)' : 'rgba(82,61,54,.36)';
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
const umber = new THREE.Color('#6b493b'), copper = new THREE.Color('#986b53');
const cheekHairs = new THREE.Color('#ae7f64');

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
      // Broken, downward-growing locks are most visible along the chin.
      const flow = u * 2 * Math.PI + .052 * v * Math.sin(u * 14);
      const clump = .52 * Math.sin(34 * flow) + .31 * Math.cos(19 * flow + .5) + .17 * Math.sin(47 * flow);
      const relief = (.0008 + .0028 * chin) * clump * Math.sin(Math.PI * v);
      p.x += Math.sign(p.x) * relief * .55;
      p.z -= relief;
      p.y -= chin * clump * .008 * Math.exp(-((v - .67) ** 2) / .013);
      positions.push(p.x, p.y, p.z);
      uvs.push(u, 1 - v);
      color.copy(umber).lerp(copper, .38 + .14 * clump + .12 * chin)
        .lerp(cheekHairs, .52 * (1 - smooth(v, 0, .28)));
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

// A low, parted moustache flows out around the corners of the upper lip.
function makeMoustache(side: number) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, x = .002 + .130 * t;
    const upper = -.110 - .043 * t ** 2.6, lower = upper - .009 - .016 * Math.sin(Math.PI * t);
    for (let j = 0; j <= 4; j++) {
      const v = j / 4, y = THREE.MathUtils.lerp(upper, lower, v);
      const cheekZ = -.27 * Math.sqrt(Math.max(0, 1 - (x / .315) ** 2 - (y / .355) ** 2));
      const jawZ = -.065 - .20 * Math.sqrt(Math.max(0, 1 - (x / .235) ** 2 - ((y + .21) / .16) ** 2));
      const depth = Math.min(cheekZ, jawZ, -.263 + x * x) - .0025 - .003 * Math.sin(Math.PI * v);
      positions.push(side * x, y, depth);
      uvs.push(.45 + .12 * t, .99 - .20 * v);
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
  return new THREE.Mesh(geometry, moustacheMaterial);
}

export function addPeterBeard(head: THREE.Group) {
  beardMaterial.map ??= beardTexture();
  moustacheMaterial.map = beardMaterial.map;
  const beard = new THREE.Mesh(makeBeard(), beardMaterial);
  beard.name = 'peter-jaw-beard';
  beard.castShadow = true;
  beard.receiveShadow = true;
  head.add(beard, makeMoustache(-1), makeMoustache(1));
}
const moustacheMaterial = new THREE.MeshPhongMaterial({
  color: '#84604a', shininess: 6, specular: '#27201d', side: THREE.DoubleSide, alphaTest: .4,
});

// One profile joins the bridge and nose tip, including the flatter underside.
export function addPeterNose(head: THREE.Group, skin: THREE.Material) {
  const profile = [
    [0, -.082, -.263], [.027, -.086, -.282], [.040, -.080, -.299],
    [.045, -.068, -.308], [.044, -.052, -.305], [.035, -.010, -.289],
    [.033, .035, -.275], [.030, .073, -.265], [0, .106, -.255],
  ];
  const section = new THREE.CatmullRomCurve3(profile.map(p => new THREE.Vector3(...p)));
  const rings = 24, sides = 24;
  const samples = section.getPoints(rings);
  const geometry = new THREE.LatheGeometry(samples.map(p => new THREE.Vector2(p.x, p.y)), sides);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const center = samples[i % samples.length];
    positions.setZ(i, center.z + positions.getZ(i) * .90);
  }
  geometry.computeVertexNormals();
  head.add(new THREE.Mesh(geometry, skin));
}

// Bent, teardrop-shaped lenses sit close to the cheeks. The arm and two
// bridges are wire-sized so the dark lenses remain the main silhouette.
export function addAviators(head: THREE.Group) {
  const frame = new THREE.MeshPhongMaterial({ color: '#aeb1ac', shininess: 78 });
  const glass = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 45, specular: '#40484c', side: THREE.DoubleSide });
  const top = new THREE.Color('#414448'), bottom = new THREE.Color('#0d141c');
  const outline = new THREE.Shape();
  outline.moveTo(.029,.089);
  outline.bezierCurveTo(.034,.117, .104,.127, .187,.127);
  outline.bezierCurveTo(.235,.127, .258,.121, .257,.091);
  outline.bezierCurveTo(.257,.04, .208,-.005, .149,-.022);
  outline.bezierCurveTo(.094,-.037, .064,-.012, .047,.032);
  outline.bezierCurveTo(.032,.065, .026,.077, .029,.089);
  const depth = (x: number) => -.292 + 1.19 * x * x;
  function wire(points: THREE.Vector3[], radius: number, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points, closed);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(curve, closed ? 48 : 16, radius, 6, closed), frame));
  }
  for (const side of [-1, 1]) {
    const lens = new THREE.ShapeGeometry(outline, 10);
    const position = lens.attributes.position, colors: number[] = [];
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i);
      position.setXYZ(i, side * x, y, depth(x));
      const c = bottom.clone().lerp(top, THREE.MathUtils.smoothstep(y, .014, .124));
      colors.push(c.r, c.g, c.b);
    }
    lens.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    lens.computeVertexNormals();
    head.add(new THREE.Mesh(lens, glass));
    const rim = outline.getSpacedPoints(42).slice(0,-1).map(p => new THREE.Vector3(side * p.x, p.y, depth(p.x)-.001));
    wire(rim, .005, true);
    wire([new THREE.Vector3(side*.25,.104,depth(.25)), new THREE.Vector3(side*.289,.093,-.148),
      new THREE.Vector3(side*.318,.066,-.056), new THREE.Vector3(side*.322,.047,.022)], .0055);
  }
  wire([new THREE.Vector3(-.034,.089,-.290), new THREE.Vector3(0,.102,-.297), new THREE.Vector3(.034,.089,-.290)], .0048);
  wire([new THREE.Vector3(-.071,.121,-.286), new THREE.Vector3(0,.123,-.289), new THREE.Vector3(.071,.121,-.286)], .003);
}
