// Original, procedural Bitcoin assets. Geometry is merged per material before instancing.
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAR_LEN } from '../config';

const ink = new THREE.MeshLambertMaterial({ color: '#10263b' });
const metal = new THREE.MeshLambertMaterial({ color: '#36576a' });
const cyan = new THREE.MeshBasicMaterial({ color: '#42f5e7' });
const orange = new THREE.MeshBasicMaterial({ color: '#ff9d32' });
const red = new THREE.MeshBasicMaterial({ color: '#ff4268' });
const white = new THREE.MeshBasicMaterial({ color: '#d7ffff' });
const purple = new THREE.MeshBasicMaterial({ color: '#a68aff' });
const yellow = new THREE.MeshBasicMaterial({ color: '#ffeaa1' });

function box(g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x,y,z); g.add(o); return o;
}
function sphere(g: THREE.Group, r: number, x: number, y: number, z: number, m: THREE.Material, seg=16) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, 10),m); o.position.set(x,y,z);g.add(o);return o;
}
export function labelTexture(text: string, fg='#e7ffff', bg='#102439', sub='') {
  const c=document.createElement('canvas');c.width=512;c.height=192;
  const ctx=c.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,512,192);
  ctx.strokeStyle=fg;ctx.lineWidth=8;ctx.strokeRect(7,7,498,178);
  ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`900 ${text.length>17?31:text.length>12?40:52}px monospace`;ctx.fillText(text,256,sub?75:98);
  if(sub){ctx.font='bold 23px monospace';ctx.fillText(sub,256,137);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
export function sign(g: THREE.Group, text: string, w:number,h:number,x:number,y:number,z:number,fg='#e7ffff',bg='#102439',sub='') {
  const m=new THREE.MeshBasicMaterial({map:labelTexture(text,fg,bg,sub),side:THREE.DoubleSide});
  const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);o.position.set(x,y,z);g.add(o);return o;
}
// Most assets use <8 draw calls regardless of the number of objects in the level.
export function merged(g:THREE.Group,name:string){
  g.updateMatrixWorld(true);const parts=new Map<THREE.Material,THREE.BufferGeometry[]>();
  g.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const mat=m.material as THREE.Material;const a=parts.get(mat)||[];a.push(m.geometry.clone().applyMatrix4(m.matrixWorld));parts.set(mat,a);});
  const out=new THREE.Group();out.name=name;
  for(const [m,gs]of parts){const mesh=new THREE.Mesh(mergeGeometries(gs)!,m);mesh.name=name+'-'+out.children.length;out.add(mesh);gs.forEach(a=>a.dispose());}
  return out;
}

// A rack convoy has the same walkable footprint as the packet it replaces.
// Fan faces and status lights are merged into material batches before instancing.
function miningRackModel() {
  const g = new THREE.Group();
  const w = 2.26, H = 3.4, D = CAR_LEN;
  const graphite = new THREE.MeshLambertMaterial({ color: '#13202c' });
  const grill = new THREE.MeshLambertMaterial({ color: '#08131c' });
  box(g, w - .10, H - .13, D - .10, 0, (H - .13) / 2, 0, graphite);
  box(g, w, .15, D, 0, .075, 0, metal);
  // Bright rails frame a genuinely flat roof; arrows identify the surfable deck.
  box(g, w - .14, .12, D - .10, 0, H - .078, 0, graphite);
  for (const side of [-1, 1]) {
    box(g, .08, .10, D, side * (w / 2 - .04), H - .05, 0, orange);
    box(g, .055, .018, D - .12, side * .86, H - .009, 0, cyan);
    for (const end of [-1, 1]) box(g, .10, H - .10, .10, side * (w / 2 - .05), H / 2 - .05, end * (D / 2 - .05), metal);
  }
  for (const z of [-2.4, -.8, .8, 2.4]) for (const side of [-1, 1]) {
    const arrow = box(g, .51, .018, .09, side * .18, H - .009, z, cyan);
    arrow.rotation.y = -side * Math.PI / 4;
  }

  const diskGeo = new THREE.CircleGeometry(1, 20);
  const ringGeo = new THREE.TorusGeometry(1, .055, 5, 20);
  const fan = (parent: THREE.Group, x: number, y: number, z: number, r: number, yaw = 0) => {
    const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = yaw; parent.add(f);
    const disk = new THREE.Mesh(diskGeo, grill); disk.scale.setScalar(r); f.add(disk);
    const ring = new THREE.Mesh(ringGeo, orange); ring.scale.setScalar(r); ring.position.z = .008; f.add(ring);
    // Five broad turbine blades read as ASIC cooling fans even from a distance.
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      const blade = box(f, r * .18, r * 1.35, .014, Math.sin(a) * r * .16, Math.cos(a) * r * .16, .012, metal);
      blade.rotation.z = -a + .3;
    }
    const hub = new THREE.Mesh(diskGeo, cyan); hub.scale.setScalar(r * .18); hub.position.z = .024; f.add(hub);
    // Dark grille bars give the fans a protected, industrial surface.
    for (const offset of [-.45, .45]) box(f, r * 1.72, r * .06, .012, 0, offset * r, .028, grill);
  };
  const front = D / 2 - .035;
  for (const x of [-.55, .55]) for (const y of [.82, 1.88]) fan(g, x, y, front, .45);
  // The side fans remain visible from the neighbouring cable or rack roof.
  for (const side of [-1, 1]) {
    for (const z of [-2.15, 0, 2.15]) fan(g, side * (w / 2 - .045), 1.45, z, .57, side * Math.PI / 2);
    for (let z = -2.8; z <= 2.8; z += .28) box(g, .025, .30, .085, side * (w / 2 - .02), .36, z, grill);
    for (let z = -2.7; z <= 2.7; z += .45) box(g, .028, .065, .12, side * (w / 2 - .018), 2.31, z, Math.round((z + 3) * 10) % 3 ? cyan : orange);
  }
  for (const x of [-.82, -.55, -.28, .28, .55, .82]) box(g, .13, .055, .025, x, 2.50, D / 2 - .013, x < 0 ? cyan : orange);
  const plate = new THREE.MeshBasicMaterial({ map: labelTexture('MINING RACK', '#b5fff1', '#13202c', 'SHA-256 / HASHING') });
  const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(2.02, .61), plate); frontPlate.position.set(0, 2.95, D / 2 - .006); g.add(frontPlate);
  for (const side of [-1, 1]) {
    const sidePlate = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .57), plate);
    sidePlate.position.set(side * (w / 2 - .006), 2.91, 0); sidePlate.rotation.y = side * Math.PI / 2; g.add(sidePlate);
  }
  // Rear heat-sink slits make every cabinet in a convoy read as hardware.
  for (let y = .5; y < 2.8; y += .22) box(g, 1.86, .08, .025, 0, y, -D / 2 + .013, grill);
  return merged(g, 'mining-rack');
}

export function packetModel(variant:number){
  if (variant === 2) return miningRackModel();
  const g=new THREE.Group();const w=2.26,H=3.4,D=CAR_LEN;
  const accent=[orange,purple,cyan,red][variant%4];
  const shell=new THREE.MeshLambertMaterial({color:[0xff8c24,0x9372e8,0x22bdb4,0xe33c5f][variant%4],transparent:true,opacity:.3,depthWrite:false});
  box(g,w,H-.12,D,0,H/2,0,shell);
  // Thick glass rim, clearly defined rideable roof, four corner spines.
  box(g,w+.02,.18,D+.02,0,H-.09,0,accent);
  box(g,w,.14,D,0,.07,0,ink);
  for(const x of [-1,1])for(const z of [-1,1])box(g,.11,H,.12,x*(w/2-.05),H/2,z*(D/2-.05),accent);
  for(const y of [.3,1.55,2.85])for(const x of [-.7,0,.7])for(const z of [-2.4,-1.2,0,1.2,2.4]) {
    const k=Math.round((x+1)*10+y*10+z*10);box(g,.42,.27,.68,x,y,z,k%3===0?white:accent);
  }
  // Roof center stripe reads as a safe platform.
  box(g,.12,.025,D-.2,0,H+.015,0,white);
  for(const z of [-2.4,-.8,.8,2.4]){box(g,.55,.028,.08,-.66,H+.02,z,ink);box(g,.55,.028,.08,.66,H+.02,z,ink);}
  const front=D/2+.075;
  if(variant===1){
    const tex=new THREE.TextureLoader().load('assets/inscription-cat.png');tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(1.98,2.15),new THREE.MeshBasicMaterial({map:tex}));face.position.set(0,1.62,front);g.add(face);
    sign(g,'BIG JPEG',2.05,.5,0,2.98,front+.02,'#eddfff','#32235d');
    sign(g,'4 MB OF MEOW',2.02,.35,0,.32,front+.02,'#f4b0ff','#32235d');
  }else if(variant===3){
    const stamp=sign(g,'REJECTED',2.05,.84,0,2.2,front+.03,'#ff6b81','#4e1230');stamp.rotation.z=-.12;
    sign(g,'STANDARDNESS',2,.38,0,1.42,front+.03,'#ffb2be','#4e1230');
  }else{
    sign(g,'BLOCK FULL',2.05,.69,0,2.58,front+.02,'#fff2dc','#bb2b25');
    sign(g,'1,000,000 vB',1.9,.4,0,1.76,front+.02,'#ffe6a8','#6d3416');
    sign(g,'₿',.75,.62,0,.77,front+.02,'#ffeac0','#713816');
  }
  // Side identification plates stay readable when riding adjacent convoys.
  for(const x of [-1,1]){const side=sign(g,variant===1?'INSCRIPTION':'TRANSACTION PACKET',3.9,.55,x*1.14,2.5,0,'#dcffff','#14283d');side.rotation.y=x*Math.PI/2;}
  return merged(g,'packet'+variant);
}

export function routerModel(variant=0){
  const g=new THREE.Group();box(g,2.08,.68,.66,0,.34,0,ink);box(g,2.05,.1,.72,0,.75,0,metal);
  for(const x of [-.83,.83]){box(g,.07,.55,.08,x,.7,-.18,metal);sphere(g,.065,x,.97,-.18,red,8);}
  // Slanted eyebrows and flashing eyes make the filter visibly grumpy.
  for(const x of [-.48,.48]){box(g,.26,.10,.03,x,.59,.35,red);const b=box(g,.38,.055,.045,x,.72,.36,metal);b.rotation.z=x>0?.24:-.24;}
  sign(g,['NONSTANDARD','SCRIPT TOO INTERESTING','TRANSACTION TOO LARGE'][variant%3],1.85,.31,0,.27,.37,'#ff8c97','#271a2c');
  for(let x=-.7;x<=.7;x+=.23)box(g,.09,.06,.04,x,.07,.36,x>.1?red:cyan);
  return merged(g,'policy-router');
}
function feeSpike(){
  const g=new THREE.Group();for(const x of [-1.02,1.02])box(g,.12,.99,.33,x,.5,0,metal);
  box(g,2.19,.22,.35,0,1.1,0,red);
  const heights=[.04,.07,.05,.10,.12,.08,.15];
  heights.forEach((h,i)=>box(g,.21,h,.18,-.81+i*.27,1.10+h/2,-.01,red));
  sign(g,'FEE SPIKE',1.6,.28,0,1.1,.19,'#fff1f1','#a51e49');return merged(g,'fee-spike');
}
function scanner(){
  const g=new THREE.Group();for(const x of [-1.07,1.07]){box(g,.12,2.65,.3,x,1.325,0,metal);box(g,.05,2.4,.05,x,1.3,.18,red);}
  box(g,2.3,.18,.3,0,2.55,0,ink);
  sphere(g,.49,0,2.12,0,white);sphere(g,.28,0,2.12,.37,red);sphere(g,.13,0,2.12,.57,ink);
  sign(g,'CHAIN SCAN',1.5,.3,0,1.48,.18,'#ffc2cb','#5b1e3c');
  box(g,2.04,.055,.25,0,1.12,0,red);
  return merged(g,'chain-scanner');
}
function bitcoinFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f7931a';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#ffd58c';
  ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(256, 256, 238, 0, Math.PI * 2); ctx.stroke();
  // Draw the mark explicitly: no font fallback, no stretched sign texture.
  ctx.translate(256, 256); ctx.rotate(13 * Math.PI / 180); ctx.translate(-264, -264);
  ctx.fillStyle = '#ffffff';
  const bitcoin = new Path2D('M164 132 H270 C332 132 360 156 360 201 C360 230 343 249 320 258 C353 267 376 291 376 329 C376 379 337 404 274 404 H164 V360 H185 V177 H164 Z M235 177 V239 H270 C298 239 312 229 312 208 C312 187 298 177 270 177 Z M235 284 V359 H278 C311 359 326 347 326 322 C326 297 311 284 278 284 Z');
  ctx.fill(bitcoin, 'evenodd');
  for (const x of [221, 267]) { ctx.fillRect(x, 96, 22, 49); ctx.fillRect(x, 391, 22, 43); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function coin() {
  const g = new THREE.Group();
  const edge = new THREE.MeshBasicMaterial({ color: '#d57512', toneMapped: false });
  const rim = new THREE.MeshBasicMaterial({ color: '#ffc568', toneMapped: false });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .105, 32), edge);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const faceMaterial = new THREE.MeshBasicMaterial({ map: bitcoinFaceTexture(), toneMapped: false });
  for (const side of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.315, .018, 8, 32), rim);
    ring.position.z = side * .062;
    g.add(ring);
    const face = new THREE.Mesh(new THREE.CircleGeometry(.30, 32), faceMaterial);
    face.position.z = side * .067;
    if (side < 0) face.rotation.y = Math.PI;
    g.add(face);
  }
  return merged(g, 'bitcoin-sat');
}
export function serverRack(){
  const g=new THREE.Group();box(g,2.2,5.8,2,0,2.9,0,ink);box(g,2.3,.16,2.1,0,5.85,0,metal);
  for(const x of [-1.06,1.06]){
    box(g,.06,5.7,.06,x,2.9,1.04,cyan);
    box(g,.09,5.7,.07,x,2.9,-1.03,metal);
    // Narrow circuit traces give the sides structure without an emissive wall.
    for(const y of [1.1,2.5,4.2]){box(g,.02,.025,1.2,x*1.04,y,0,cyan);box(g,.02,.30,.025,x*1.04,y+.14,-.6,cyan);}
  }
  for(const y of [1,2,3,4,5]){
    box(g,1.8,.035,.03,0,y,-1.025,metal);
    box(g,.10,.08,.035,-.7,y+.18,-1.03,cyan);
    box(g,.10,.08,.035,-.48,y+.18,-1.03,orange);
  }
  for(let y=.45;y<5.5;y+=.48){box(g,1.95,.34,.13,0,y,1.03,metal);for(const x of [-.73,-.48])box(g,.10,.08,.05,x,y,1.11,Math.round(y*10)%2?cyan:orange);for(let x=-.1;x<.8;x+=.13)box(g,.05,.16,.02,x,y,1.115,ink);}
  sign(g,'BITCOIN NODE',1.93,.3,0,5.55,1.1,'#74f8ec','#142a3e');return merged(g,'server-rack');
}
export function droneModel(){
  const g=new THREE.Group();sphere(g,.48,0,0,0,metal);sphere(g,.38,0,.015,.24,white);sphere(g,.23,0,.015,.51,red);sphere(g,.105,0,.015,.7,ink);
  for(const x of [-1,1]){box(g,.6,.1,.12,x*.62,.1,0,metal);const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.045,6,20),red);ring.rotation.x=Math.PI/2;ring.position.set(x*.85,.16,0);g.add(ring);box(g,.64,.025,.06,x*.85,.18,0,cyan);}
  const glass=new THREE.Mesh(new THREE.TorusGeometry(.27,.055,8,24),yellow);glass.position.set(.62,-.3,.42);g.add(glass);const handle=box(g,.10,.48,.1,.81,-.62,.42,metal);handle.rotation.z=.5;
  return merged(g,'surveillance-drone');
}
export function minerModel(){
  const g=new THREE.Group();box(g,7.6,5.6,2,0,2.8,0,ink);
  for(const x of [-2.4,0,2.4])for(const y of [1.5,3.6]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.77,.12,8,24),orange);ring.position.set(x,y,1.05);g.add(ring);for(let k=0;k<5;k++){const blade=box(g,.16,1.3,.08,x,y,1.03,metal);blade.rotation.z=k*Math.PI/5;}sphere(g,.16,x,y,1.15,cyan);}
  sign(g,'MINER',6.8,.7,0,6.1,1.03,'#ffbe63','#152c3b','DIRECT SUBMISSION');
  return merged(g,'miner');
}
export function createBitcoinCore():GLTF {
  const scene=new THREE.Group();const models=[packetModel(0),routerModel(),feeSpike(),scanner(),coin()];
  const names=['train','low','hurdle','overhead','coin'];models.forEach((o,i)=>{o.name=names[i];scene.add(o);});
  return {scene,scenes:[scene],animations:[],cameras:[],asset:{version:'2.0'},userData:{}} as unknown as GLTF;
}
