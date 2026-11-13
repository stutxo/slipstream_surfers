// IFD's feathered hair and jewelry are part of the animated rig, including the wristwatch.
import * as THREE from 'three';

const hairRoot = new THREE.MeshPhongMaterial({ color: '#86734d', shininess: 42 });
const hairLow = new THREE.MeshPhongMaterial({ color: '#aa915d', shininess: 48 });
const hairGold = new THREE.MeshPhongMaterial({ color: '#cbb47c', shininess: 60, specular: '#e6d5ac' });
const hairLight = new THREE.MeshPhongMaterial({ color: '#e1ca92', shininess: 65, specular: '#fff0ce' });
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

// Tapered, flattened locks curve away from the face and flick outward at the tips.
// This keeps the feathered silhouette distinct from the earlier straight hanging locks.
function feather(parent:THREE.Object3D,points:number[][],width:number,depth:number,material:THREE.Material) {
  const path=curve(points),segments=20,sides=8,frames=path.computeFrenetFrames(segments,false);
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++) {
    const t=i/segments,p=path.getPointAt(t);
    const taper=(.62+.38*Math.sin(Math.PI*t))*(1-.94*Math.pow(t,2));
    for(let j=0;j<sides;j++) {
      const angle=j/sides*Math.PI*2;
      const v=p.clone().addScaledVector(frames.normals[i],Math.cos(angle)*width*taper).addScaledVector(frames.binormals[i],Math.sin(angle)*depth*taper);
      positions.push(v.x,v.y,v.z);
      if(i<segments) {const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;indices.push(a,b,c,b,d,c);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return mesh(parent,geometry,material);
}

export function addGlamHair(head:THREE.Group) {
  const hair=new THREE.Group();hair.name='ifd-feathered-hair';head.add(hair);
  oval(hair,hairRoot,0,.025,.10,.36,.39,.29);
  // Back volume falls to the shoulders, with layered waves instead of straight ropes.
  for(let i=-3;i<=3;i++) {
    const x=i*.082,side=i<0?-1:1;
    feather(hair,[[x,.26,.24],[x*1.25,.02,.34],[x*1.30,-.27,.33],[x+side*.11,-.47,.22]],.09,.055,i%2?hairLow:hairGold);
  }
  for(const side of [-1,1]) {
    // Feathered side layers fan out and sweep back, the recognizable 1970s shape.
    for(let i=0;i<5;i++) {
      const y=.22-i*.105;
      feather(hair,[[side*.22,y+.08,-.075],[side*.35,y+.055,-.11],[side*(.43+i*.012),y-.03,.005],[side*(.48+i*.01),y+.015,.13]],.105-i*.007,.052,i%2?hairGold:hairLight);
    }
    // Longer outer layers curl past the shoulders, keeping the feathered cut full.
    for(let i=0;i<2;i++) {
      feather(hair,[[side*.31,.12,.10],[side*(.40+i*.045),-.10,.14],[side*(.43+i*.04),-.34,.17],[side*(.51+i*.025),-.43+i*.025,.24]],.09,.048,i?hairLight:hairGold);
    }
    // A soft center part opens above the brows; no solid swoop across the forehead.
    for(let i=0;i<3;i++) {
      feather(hair,[[side*(.025+i*.035),.33+i*.016,-.10],[side*.16,.365+i*.01,-.17],[side*.29,.28-i*.025,-.16],[side*.39,.18-i*.07,-.015]],.075,.036,i===1?hairLight:hairGold);
    }
  }
}

export function addTiaraAndEarrings(head:THREE.Group) {
  const tiara=new THREE.Group();tiara.name='ifd-tiara';head.add(tiara);
  const band:number[][]=[];
  for(let i=0;i<=16;i++) {const x=-.29+i*.58/16;band.push([x,.355+Math.abs(x)*.08,-.205+Math.pow(x/.29,2)*.10]);}
  wire(tiara,band,.016);
  wire(tiara,band.map(p=>[p[0],p[1]+.032,p[2]-.006]),.009);
  for(let i=-2;i<=2;i++) {
    const x=i*.107,base=.388,peak=base+.14-.035*Math.abs(i),z=-.218+Math.abs(i)*.025;
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

let dialMaterial:THREE.MeshBasicMaterial|undefined;
function rolexDial() {
  if(dialMaterial)return dialMaterial;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const g=canvas.getContext('2d')!;g.fillStyle='#103b2d';g.fillRect(0,0,256,256);
  g.strokeStyle='#f2d47d';g.fillStyle='#f2d47d';
  for(let i=0;i<12;i++) {const a=i/12*Math.PI*2;g.save();g.translate(128+Math.sin(a)*99,128-Math.cos(a)*99);g.rotate(a);g.fillRect(-4,-10,8,20);g.restore();}
  // Crown emblem, green dial, gold indices and date window read as a classic gold Rolex.
  g.beginPath();g.moveTo(104,62);g.lineTo(99,42);g.lineTo(114,51);g.lineTo(128,32);g.lineTo(142,51);g.lineTo(157,42);g.lineTo(152,62);g.closePath();g.fill();g.fillRect(108,66,40,5);
  g.font='bold 20px serif';g.textAlign='center';g.fillText('ROLEX',128,94);
  g.fillStyle='#fff8df';g.fillRect(189,116,35,25);g.fillStyle='#16211d';g.font='bold 17px sans-serif';g.fillText('21',206,135);
  g.strokeStyle='#fff4bd';g.lineCap='round';g.lineWidth=8;g.beginPath();g.moveTo(128,128);g.lineTo(94,91);g.moveTo(128,128);g.lineTo(182,86);g.stroke();
  g.lineWidth=2;g.beginPath();g.moveTo(128,143);g.lineTo(126,50);g.stroke();
  g.fillStyle='#f2d47d';g.beginPath();g.arc(128,128,7,0,Math.PI*2);g.fill();
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  dialMaterial=new THREE.MeshBasicMaterial({map,toneMapped:false});return dialMaterial;
}

export function addGlamWrist(arm:THREE.Group,watch:boolean) {
  if(!watch) {
    for(const y of [-.28,-.325,-.37]) {const bangle=mesh(arm,new THREE.TorusGeometry(.071,.012,8,22),gold,0,y,0);bangle.rotation.x=Math.PI/2;}
    return;
  }
  const accessory=new THREE.Group();accessory.name='ifd-rolex';arm.add(accessory);
  // Segmented gold bracelet follows the wrist, with an oversized dial for arcade readability.
  for(let i=0;i<12;i++) {
    const a=i/12*Math.PI*2;
    const link=mesh(accessory,new THREE.BoxGeometry(.041,.068,.021),gold,Math.sin(a)*.069,-.315,Math.cos(a)*.069);link.rotation.y=a;
  }
  const bezel=mesh(accessory,new THREE.CylinderGeometry(.085,.085,.033,32),gold,0,-.315,-.084);bezel.rotation.x=Math.PI/2;
  for(let i=0;i<24;i++) {const a=i/24*Math.PI*2;const flute=mesh(accessory,new THREE.BoxGeometry(.008,.015,.012),gold,Math.sin(a)*.079,-.315+Math.cos(a)*.079,-.106);flute.rotation.z=-a;}
  const face=mesh(accessory,new THREE.CircleGeometry(.067,32),rolexDial(),0,-.315,-.104);face.rotation.y=Math.PI;
  const windingCrown=mesh(accessory,new THREE.CylinderGeometry(.019,.019,.022,12),gold,.094,-.315,-.084);windingCrown.rotation.z=Math.PI/2;
}
