// IFD's hair, tiara and jewelry follow the character rig.
import * as THREE from 'three';

const hairMaterial = new THREE.MeshPhongMaterial({
  vertexColors: true, shininess: 24, specular: '#43362b', side: THREE.DoubleSide,
});
const roots = new THREE.Color('#835e42');
const honey = new THREE.Color('#cba46d');
const blonde = new THREE.Color('#e4c38a');
const gold = new THREE.MeshPhongMaterial({ color: '#f1c34f', shininess: 125, specular: '#fff7cf', emissive: '#382400', emissiveIntensity: .2 });
const diamond = new THREE.MeshPhongMaterial({ color: '#f4fbff', shininess: 150, specular: '#ffffff', emissive: '#748ba0', emissiveIntensity: .12 });
const sphere = new THREE.SphereGeometry(1, 20, 14);

function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x=0, y=0, z=0) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
function oval(parent: THREE.Object3D, material: THREE.Material, x:number,y:number,z:number,sx:number,sy:number,sz:number) {
  const m=mesh(parent,sphere,material,x,y,z);m.scale.set(sx,sy,sz);return m;
}
function curve(points:number[][]) { return new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2]))); }
function wire(parent:THREE.Object3D,points:number[][],radius=.011,material:THREE.Material=gold) {
  return mesh(parent,new THREE.TubeGeometry(curve(points),24,radius,7,false),material);
}

// One continuous surface covers the scalp and falls over the shoulders. Each
// column follows the same lock from the off-centre part to its tapered end.
export function addGlamHair(head: THREE.Group) {
  const columns = 192, crownRows = 18, lengthRows = 15;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const color = new THREE.Color();
  const smooth = THREE.MathUtils.smoothstep;
  const lerp = THREE.MathUtils.lerp;
  // A shared pole and wrapped columns keep the crown and back seamless.
  positions.push(.095, .394, -.045);
  colors.push(roots.r, roots.g, roots.b);
  for (let row = 1; row <= crownRows + lengthRows; row++) {
    const crown = Math.min(1, row / crownRows);
    const length = Math.max(0, (row - crownRows) / lengthRows);
    for (let column = 0; column < columns; column++) {
      const angle = 2 * Math.PI * column / columns - Math.PI;
      const side = Math.sin(angle), back = (1 - Math.cos(angle)) / 2;
      // The heavy sweep falls by one temple. The other side sits behind the ear.
      const temple = angle < 0 ? .61 : .91;
      const curtain = smooth(Math.abs(angle), temple, temple + .53);
      const flow = angle + .19 * (1 - crown) + .07 * length * Math.sin(2 * angle + 3 * length);
      // The hairline rises at the part and curves diagonally toward the fuller side.
      const partLift = Math.exp(-((angle - .43) ** 2) / .18);
      const fringe = .80 - .19 * partLift - .39 * side + .035 * Math.sin(6 * angle);
      const phi = crown * lerp(fringe, Math.PI / 2, curtain);
      const volume = Math.sin(phi);
      const broad = Math.cos(15 * angle + 1.4 * Math.sin(4 * angle));
      const strands = Math.cos(31 * angle + 1.8 * Math.sin(5 * angle));
      const fine = Math.cos(59 * angle + 1.5 * Math.sin(6 * angle));
      const ridge = volume * (.008 * broad + .004 * strands);
      const forelock = Math.exp(-((angle + .18) ** 2) / .35);
      const sweep = (Math.max(0, -side) * .030 + forelock * .042) * Math.sin(Math.PI * crown);
      const taper = 1 - curtain * (.14 * length + .036 * Math.sin(2 * Math.PI * length));
      const crownOffset = .095 * Math.pow(Math.cos(phi), 2);
      // Let the short hairline blend into the forehead while longer layers hang free.
      const hairline = (1 - curtain) * length;
      const x = crownOffset + (.365 + ridge + sweep) * volume * Math.sin(flow) * taper * (1 - .11 * hairline);
      const wave = .016 * Math.sin(2 * angle + 5 * length) * length;
      const z = lerp(-.045, .020, crown) - (.317 + ridge) * volume * Math.cos(flow) * taper
        - .11 * length * curtain * (1 - back) + wave * curtain + .047 * hairline;
      const tip = .515 + .028 * broad + .018 * strands + .028 * side;
      const y = .394 * Math.cos(phi) + sweep - length * lerp(.030, tip, curtain);
      positions.push(x, y, z);
      // Vary colour along the locks, including the crown facing the chase camera.
      const shade = .44 + .21 * broad + .17 * strands + .055 * fine;
      const grownOut = smooth(crown + length, .04, 1.12);
      color.copy(roots).lerp(honey, grownOut * (.68 + .32 * shade));
      color.lerp(blonde, shade * smooth(crown + length, .10, .94) * (.72 + .22 * length));
      colors.push(color.r, color.g, color.b);
    }
    const start = 1 + (row - 1) * columns;
    for (let column = 0; column < columns; column++) {
      const current = start + column, next = start + (column + 1) % columns;
      if (row === 1) indices.push(0, next, current);
      else indices.push(current - columns, next - columns, current, next - columns, next, current);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const hair = mesh(head, geometry, hairMaterial);
  hair.name = 'ifd-side-parted-hair';
}

export function addTiaraAndEarrings(head:THREE.Group) {
  const tiara=new THREE.Group();tiara.name='ifd-tiara';head.add(tiara);
  // A fitted gold band follows the curved crown on both temples.
  const bandHeight = (x:number) => .330 - .105 * (x / .305) ** 2;
  const band:number[][]=[];
  for(let i=0;i<=32;i++) {
    const angle = (i / 32 - .5) * 1.4 * Math.PI;
    const x = .305 * Math.sin(angle);
    band.push([x, bandHeight(x), -.010 - .179 * Math.cos(angle)]);
  }
  wire(tiara,band,.012);
  wire(tiara,band.map(([x,y,z])=>[x,y+.018,z-.003]),.007);
  for(let i=-2;i<=2;i++) {
    const x=i*.107,base=bandHeight(x)+.013,peak=base+.115-.018*Math.abs(i);
    const z=-.014-.179*Math.sqrt(1-(x/.305)**2);
    wire(tiara,[[x-.05,base,z],[x,peak,z-.012],[x+.05,base,z]],.009);
    const gem=mesh(tiara,new THREE.OctahedronGeometry(i===0?.044:.031),diamond,x,peak,z-.012);gem.scale.set(1,1.3,.55);
    oval(tiara,gold,x,peak+.048, z-.012,.014,.014,.014);
  }
  for(const side of [-1,1]) {
    const hoop=mesh(head,new THREE.TorusGeometry(.065,.016,8,28),gold,side*.36,-.105,-.16);hoop.scale.y=1.32;
    mesh(head,new THREE.OctahedronGeometry(.022),diamond,side*.36,-.206,-.16);
  }
}

export function addGlamNecklaces(torso:THREE.Group) {
  wire(torso,[[-.12,.235,-.17],[-.13,.13,-.19],[0,.045,-.197],[.13,.13,-.19],[.12,.235,-.17]],.012);
  wire(torso,[[-.15,.20,-.16],[-.16,.025,-.19],[0,-.065,-.20],[.16,.025,-.19],[.15,.20,-.16]],.008);
  const pendant=mesh(torso,new THREE.OctahedronGeometry(.037),diamond,0,.012,-.21);pendant.scale.set(.8,1.3,.45);
  const setting=mesh(torso,new THREE.TorusGeometry(.035,.008,7,20),gold,0,.012,-.205);setting.scale.set(.8,1.3,1);
  for(const side of [-1,1])oval(torso,gold,side*.09,-.04,-.205,.012,.012,.01);
}

export function addGlamBangle(arm: THREE.Group) {
  const bangle = mesh(arm, new THREE.TorusGeometry(.07, .009, 8, 24), gold, 0, -.316, 0);
  bangle.rotation.x = Math.PI / 2;
}
