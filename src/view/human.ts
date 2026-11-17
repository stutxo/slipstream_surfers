// Rounded, rigged arcade humans. The supplied photographs guide outfits and silhouettes;
// the game uses original geometry rather than putting a photo on the character's face.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { CharacterId } from '../characters';
import { addGlamHair, addTiaraAndEarrings, addGlamNecklaces, addGlamBangle } from './glam';
import { addBackpack } from './backpack';
import { addPeterHair } from './peter-hair';
import { addPeterBeard, addPeterNose, addAviators } from './peter-face';
import { addPodcastMic, addKeyboard } from './props';

export interface RunnerParts {
  group: THREE.Group;
  shell: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  eyebrows: THREE.Mesh[];
  heldProp?: { kind: 'microphone' | 'keyboard'; object: THREE.Object3D; arm: number };
}

type HumanId = Exclude<CharacterId, 'transaction'>;
const sphere = new THREE.SphereGeometry(1, 24, 16);
const skin = new THREE.MeshPhongMaterial({ color: '#e8ad86', shininess: 24, specular: '#593e2f' });
const fairSkin = new THREE.MeshPhongMaterial({ color: '#f0c5a1', shininess: 24, specular: '#593e2f' });
const black = new THREE.MeshPhongMaterial({ color: '#111318', shininess: 16 });
const white = new THREE.MeshPhongMaterial({ color: '#faf6e8', shininess: 38 });
const brown = new THREE.MeshPhongMaterial({ color: '#513426', shininess: 25 });
const gold = new THREE.MeshPhongMaterial({ color: '#eac16d', shininess: 80, specular: '#ffe6a3' });
const red = new THREE.MeshPhongMaterial({ color: '#bd343e', shininess: 18 });
const cyan = new THREE.MeshBasicMaterial({ color: '#68ecff', toneMapped: false });
const denim = new THREE.MeshPhongMaterial({ color: '#282f3c', shininess: 12 });
const trackPants = new THREE.MeshPhongMaterial({ color: '#111216', shininess: 18 });

function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function oval(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const m = mesh(parent, sphere, mat, x, y, z); m.scale.set(sx, sy, sz); return m;
}
function box(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, r = .04) {
  return mesh(parent, new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z);
}
function tube(parent: THREE.Object3D, mat: THREE.Material, points: number[][], radius: number) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])));
  return mesh(parent, new THREE.TubeGeometry(curve, 12, radius, 6, false), mat, 0, 0, 0);
}
function triangle(parent: THREE.Object3D, mat: THREE.Material, points: number[][]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  g.setIndex([0, 1, 2]); g.computeVertexNormals();
  return mesh(parent, g, mat, 0, 0, 0);
}

let shirtMaterial: THREE.Material | undefined;
function dottedShirt() {
  if (shirtMaterial) return shirtMaterial;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b9d8f1'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#577a9e';
  for (let y = 10; y < 256; y += 21) for (let x = 10; x < 256; x += 21) {
    g.beginPath(); g.arc(x + (y % 2) * 5, y, 1.65, 0, Math.PI * 2); g.fill();
  }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  shirtMaterial = new THREE.MeshPhongMaterial({ map, shininess: 17 }); return shirtMaterial;
}
let badgeMaterial: THREE.MeshBasicMaterial | undefined;
function badge(parent: THREE.Object3D, y: number, z: number, size = .29) {
  if (!badgeMaterial) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f7931a'; g.beginPath(); g.arc(128,128,124,0,Math.PI*2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 174px Arial'; g.textAlign = 'center'; g.fillText('B',128,188);
    g.fillRect(103,41,11,29);g.fillRect(130,41,11,29);g.fillRect(103,177,11,32);g.fillRect(130,177,11,32);
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
    badgeMaterial = new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false });
  }
  return mesh(parent, new THREE.PlaneGeometry(size,size), badgeMaterial, 0,y,z);
}

function head(parent: THREE.Group, id: HumanId, eyebrows: THREE.Mesh[]) {
  const isIFD = id === 'ifd', isPeter = id === 'peter-todd';
  const complexion = isIFD ? fairSkin : skin;
  const h = new THREE.Group(); h.position.set(0,isPeter ? .60 : .53,0); parent.add(h);
  if (isPeter) h.scale.set(.94,.97,.97);
  h.name = id + '-head';
  if (isIFD) addGlamHair(h);
  oval(h, complexion,0,0,0,.315,.355,.27);
  oval(h, complexion,0,-.21,isIFD ? -.025 : -.065,isIFD ? .21 : .235,isIFD ? .13 : .16,isIFD ? .145 : .20);
  for (const side of [-1,1]) {
    oval(h,complexion,side*.306,-.015,-.01,.063,.092,.05);
    oval(h,new THREE.MeshPhongMaterial({color:isIFD?'#ce956f':'#c48261'}),side*.33,-.015,-.048,.026,.048,.014);
  }
  if (isPeter) {
    addPeterHair(h);
    addPeterBeard(h);
    addAviators(h);
  }
  if (isIFD) addTiaraAndEarrings(h);
  for (const side of [-1,1]) {
    if (!isPeter) {
      oval(h,white,side*.125,.055,-.248,isIFD?.073:.083,isIFD?.052:.061,isIFD?.031:.04);
      oval(h,id==='portlandhodl'?cyan:new THREE.MeshPhongMaterial({color:'#5b7475'}),side*.125,.055,isIFD?-.274:-.282,isIFD?.031:.038,isIFD?.035:.044,.015);
      oval(h,black,side*.125,.055,isIFD?-.287:-.296,isIFD?.015:.018,isIFD?.023:.027,.008);
      oval(h,white,side*.125-.011,.072,isIFD?-.295:-.304,.009,.011,.005);
    }
    const browY = isPeter ? .145 : .155;
    const brow=box(h,brown,side*.126,browY,-.231,.13,isPeter ? .018 : .029,.03,.012);
    brow.rotation.z=side*.1; brow.userData.restY=browY; eyebrows.push(brow);
    if (id==='portlandhodl') {
      const streak=box(h,cyan,side*.205,.055,-.3,.24,.018,.015,.004);streak.rotation.z=-side*.10;
      oval(h,cyan,side*.125,.055,-.31,.045,.024,.01);
    }
  }
  if (isPeter) {
    addPeterNose(h, complexion);
    tube(h,new THREE.MeshPhongMaterial({color:'#915b49',shininess:10}),
      [[-.083,-.149,-.243],[-.029,-.150,-.255],[.037,-.151,-.255],[.089,-.146,-.242]],.004);
    return;
  }
  oval(h,complexion,0,-.03,isIFD?-.266:-.277,isIFD?.042:.055,isIFD?.061:.078,isIFD?.047:.072);
  // Smiling mouths are tubes and teeth, so the face remains an actual 3D model.
  const mouthColor=new THREE.MeshPhongMaterial({color:isIFD?'#9f4e4d':'#6d3528'});
  tube(h,mouthColor,[[-.106,-.15,-.254],[0,-.184,-.28],[.108,-.145,-.253]],.013);
  if(!isIFD) {
    const teeth=box(h,white,0,-.16,-.281,.14,.031,.013,.011);teeth.rotation.x=.12;
  } else tube(h,mouthColor,[[-.087,-.15,-.261],[0,-.145,-.285],[.087,-.147,-.26]],.009);
}

export function makeHuman(id: HumanId): RunnerParts {
  const group = new THREE.Group(); group.name = id + '-runner';
  const shell = new THREE.Group(); shell.position.y=.91; group.add(shell);
  const isIFD=id==='ifd', isPeter=id==='peter-todd';
  const complexion=isIFD?fairSkin:skin;
  const cloth = isIFD ? black : isPeter ? red : dottedShirt();
  box(shell,cloth,0,0,0,isIFD?.46:.53,.53,.30,.095);
  oval(shell,complexion,0,isPeter ? .31 : .285,0,isPeter ? .12 : .105,isPeter ? .17 : .13,.10);
  if(isIFD) {
    triangle(shell,complexion,[[-.11,.254,-.155],[.11,.254,-.155],[0,.105,-.16]]);
    box(shell,gold,0,-.255,-.164,.09,.045,.016,.008);
    addGlamNecklaces(shell);
  } else if(!isPeter) {
    const collarMat=new THREE.MeshPhongMaterial({color:'#d1e6f8',shininess:18});
    triangle(shell,collarMat,[[-.13,.26,-.162],[0,.16,-.18],[-.15,.09,-.17]]);
    triangle(shell,collarMat,[[.13,.26,-.162],[.15,.09,-.17],[0,.16,-.18]]);
    box(shell,collarMat,0,-.035,-.159,.027,.39,.013,.005);
    for(let y=.10;y>-.25;y-=.09)oval(shell,white,0,y,-.172,.011,.011,.006);
  }
  head(shell,id,[]);
  // Find the brows for the common rig's expression animation.
  const eyebrows:THREE.Mesh[]=[];
  shell.traverse(o=>{if(o.userData.restY!==undefined)eyebrows.push(o as THREE.Mesh);});
  if(isPeter) {
    const pack = addBackpack(shell);
    badge(shell,pack.badgeY,pack.badgeZ,.22);
  }
  // Hips, articulated limbs and chunky sneakers share exactly the same pivots.
  box(group,isIFD?black:isPeter?trackPants:denim,0,.62,0,isIFD?.41:.46,.20,.28,.06);
  const legs:THREE.Group[]=[],arms:THREE.Group[]=[];
  for(const side of [-1,1]) {
    const leg=new THREE.Group();leg.position.set(side*.145,.63,0);group.add(leg);
    mesh(leg,new THREE.CapsuleGeometry(isIFD?.078:.089,.27,5,12),isIFD?black:isPeter?trackPants:denim,0,-.22,0);
    if(isPeter) {
      // Three white stripes follow the outer side of each black track-pant leg.
      for(const z of [-.045,0,.045]) {
        const x=side*(Math.sqrt(.089*.089-z*z)+.003);
        box(leg,white,x,-.22,z,.012,.32,.014,.005);
      }
      mesh(leg,new THREE.CylinderGeometry(.087,.082,.045,12),trackPants,0,-.425,0);
    }
    box(leg,white,0,-.51,-.07,.235,.17,.37,.06);
    box(leg,isPeter?red:id==='portlandhodl'?cyan:gold,0,-.566,-.064,.239,.026,.34,.012);
    for(let k=0;k<3;k++)box(leg,white,0,-.451,-.12-k*.045,.12,.012,.015,.004);
    legs.push(leg);
    const arm=new THREE.Group();arm.position.set(side*(isIFD?.26:.30),1.11,0);group.add(arm);
    arm.rotation.z=side*.24;
    mesh(arm,new THREE.CapsuleGeometry(isIFD?.062:.075,.26,5,12),complexion,0,-.195,0);
    if(!isIFD)mesh(arm,new THREE.CapsuleGeometry(.092,.08,5,12),cloth,0,-.06,0);
    oval(arm,complexion,0,-.398,-.025,.082,.10,.075);
    oval(arm,complexion,-side*.061,-.369,-.059,.035,.049,.04);
    if(isIFD && side===1) addGlamBangle(arm);
    if(isIFD && side===-1) addPodcastMic(arm);
    if(id==='portlandhodl' && side===1) addKeyboard(arm);
    arms.push(arm);
  }
  group.traverse(o=>{if((o as THREE.Mesh).isMesh)o.frustumCulled=false;});
  const heldProp: RunnerParts['heldProp'] = isIFD
    ? { kind: 'microphone', object: group.getObjectByName('ifd-podcast-mic')!, arm: 0 }
    : id==='portlandhodl'
      ? { kind: 'keyboard', object: group.getObjectByName('portland-keyboard')!, arm: 1 }
      : undefined;
  return {group,shell,legs,arms,eyebrows,heldProp};
}
