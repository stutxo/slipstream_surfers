import * as THREE from 'three';

const frame = new THREE.MeshPhongMaterial({color:'#52515a', specular:'#a19b9c', shininess:54});
const glass = new THREE.MeshPhongMaterial({
  color:'#d5e3eb', specular:'#b7c7d0', shininess:95, transparent:true, opacity:.075,
  side:THREE.DoubleSide, depthWrite:false,
});

function wire(parent: THREE.Group, points: THREE.Vector3[], radius: number, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, closed ? 60 : 16, radius, 6, closed), frame));
}

export function addPeterGlasses(head: THREE.Group) {
  const outline = new THREE.Shape();
  outline.moveTo(.036,.108);
  outline.bezierCurveTo(.086,.116, .197,.118, .245,.106);
  outline.quadraticCurveTo(.253,.104, .253,.091);
  outline.lineTo(.243,.004);
  outline.quadraticCurveTo(.241,-.011, .220,-.014);
  outline.bezierCurveTo(.180,-.019, .100,-.018, .068,-.009);
  outline.quadraticCurveTo(.054,-.006, .050,.011);
  outline.lineTo(.032,.088);
  outline.quadraticCurveTo(.028,.105, .036,.108);
  const depth = (x: number, y: number) => -.302 + .58 * x * x - .035 * y;
  for (const side of [-1,1]) {
    const lens = new THREE.ShapeGeometry(outline);
    const pos = lens.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setXYZ(i, side * x, y, depth(x, y));
    }
    lens.computeVertexNormals();
    head.add(new THREE.Mesh(lens, glass));
    const rim = outline.getSpacedPoints(56).slice(0,-1)
      .map(p => new THREE.Vector3(side*p.x, p.y, depth(p.x,p.y)-.001));
    wire(head, rim, .0054, true);
    wire(head, [
      new THREE.Vector3(side*.249,.094,depth(.249,.094)),
      new THREE.Vector3(side*.278,.095,-.247), new THREE.Vector3(side*.316,.077,-.077),
      new THREE.Vector3(side*.323,.062,.004), new THREE.Vector3(side*.320,.027,.042),
    ], .006);
  }
  wire(head, [new THREE.Vector3(-.035,.083,-.302), new THREE.Vector3(0,.091,-.309),
    new THREE.Vector3(.035,.083,-.302)], .0052);
}

// Sample the skin under each detail. The outer and inner rings let a curved
// eyelid or lip hold its shape across the cheek, including its three-quarter view.
function skinDepth(x: number, y: number) {
  const depth = (rx: number, ry: number, cy: number, rz: number, cz: number) =>
    cz - rz * Math.sqrt(Math.max(0, 1 - (x/rx)**2 - ((y-cy)/ry)**2));
  return Math.min(depth(.315,.355,0,.27,0), depth(.235,.16,-.21,.20,-.065));
}

function faceDetail(head: THREE.Group, shape: THREE.Shape, color: string, offset: number,
  centerX = 0, centerY = 0, side = 1) {
  const edge = shape.getSpacedPoints(40).slice(0,-1);
  const center = edge.reduce((sum, p) => sum.add(p), new THREE.Vector2()).multiplyScalar(1/edge.length);
  const vertices: number[] = [], indices: number[] = [];
  const vertex = (p: THREE.Vector2) => {
    const x = side * (centerX + p.x), y = centerY + p.y;
    vertices.push(x, y, skinDepth(x,y) - offset);
  };
  vertex(center);
  for (const radius of [.5, 1]) {
    for (const p of edge) vertex(center.clone().lerp(p, radius));
  }
  for (let i=0; i<edge.length; i++) {
    const next = (i+1) % edge.length, n = edge.length;
    indices.push(0, 1+i, 1+next, 1+i, 1+n+i, 1+n+next, 1+i, 1+n+next, 1+next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));
  head.add(mesh);
  return mesh;
}

function ellipse(x: number, y: number, rx: number, ry: number) {
  const shape = new THREE.Shape();
  shape.absellipse(x,y,rx,ry,0,Math.PI*2,false,0);
  return shape;
}

export function addPeterExpression(head: THREE.Group) {
  const eye = new THREE.Shape();
  eye.moveTo(-.059,-.003);
  eye.bezierCurveTo(-.032,.015, -.003,.022, .024,.018);
  eye.quadraticCurveTo(.049,.015, .061,.005);
  eye.bezierCurveTo(.031,-.014, -.025,-.019, -.059,-.003);
  const lid = new THREE.Shape();
  lid.moveTo(-.063,-.005);
  lid.bezierCurveTo(-.043,.025, .015,.039, .049,.020);
  lid.quadraticCurveTo(.061,.014, .066,.004);
  lid.bezierCurveTo(.029,.023, -.014,.027, -.063,-.005);
  const brow = new THREE.Shape();
  brow.moveTo(-.061,-.005);
  brow.bezierCurveTo(-.026,.009, .021,.016, .043,.011);
  brow.quadraticCurveTo(.060,.007, .067,-.001);
  brow.bezierCurveTo(.031,.005, -.010,.001, -.053,-.013);
  brow.quadraticCurveTo(-.064,-.014, -.061,-.005);
  for (const side of [-1,1]) {
    const x=.125, y=.048;
    faceDetail(head,eye,'#d6c7b9',.004,x,y,side);
    faceDetail(head,ellipse(0,.003,.022,.015),'#687371',.0058,x,y,side);
    faceDetail(head,ellipse(0,.003,.012,.012),'#393538',.0075,x,y,side);
    faceDetail(head,ellipse(side*.006,.008,.0035,.0035),'#f6ece1',.009,x,y,side);
    faceDetail(head,lid,'#c5977e',.009,x,y,side);
    const browY = .127, browZ = skinDepth(side*x,browY);
    const eyebrow = faceDetail(head,brow,'#654f45',.005,x,browY,side);
    eyebrow.geometry.translate(-side*x, -browY, -browZ);
    eyebrow.position.set(side*x,browY,browZ);
    eyebrow.userData.restY = browY;
  }
  const mouth = new THREE.Shape();
  mouth.moveTo(-.095,-.143);
  mouth.bezierCurveTo(-.054,-.148, -.008,-.141, .027,-.142);
  mouth.quadraticCurveTo(.066,-.146, .097,-.132);
  mouth.bezierCurveTo(.065,-.167, .018,-.183, -.025,-.178);
  mouth.quadraticCurveTo(-.072,-.174, -.095,-.143);
  const lowerLip = new THREE.Shape();
  lowerLip.moveTo(-.088,-.147);
  lowerLip.bezierCurveTo(-.049,-.183, -.003,-.182, .040,-.166);
  lowerLip.quadraticCurveTo(.071,-.157, .090,-.139);
  lowerLip.bezierCurveTo(.053,-.185, -.040,-.203, -.078,-.163);
  lowerLip.closePath();
  faceDetail(head,lowerLip,'#be8b75',.004);
  faceDetail(head,mouth,'#744f45',.007);
  const teeth = new THREE.Shape();
  teeth.moveTo(-.067,-.147);
  teeth.bezierCurveTo(-.022,-.148, .036,-.141, .076,-.140);
  teeth.quadraticCurveTo(.048,-.156, -.010,-.158);
  teeth.quadraticCurveTo(-.050,-.158, -.067,-.147);
  faceDetail(head,teeth,'#e8d6b8',.009);
}
