// Textures drawn on a canvas at start-up: no image files to download for the ground, sky, glow and icons.
import * as THREE from 'three';
import type { PowerKind } from '../sim/types';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d') as CanvasRenderingContext2D };
}
function tex(c: HTMLCanvasElement, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
/** Dark circuit tiles and bright fibre bundles; the map is the inside of a network. */
export function trackTexture() {
  const {c,g}=canvas(256,256);
  g.fillStyle='#0b1011';g.fillRect(0,0,256,256);
  const glow=g.createLinearGradient(0,0,256,0);
  glow.addColorStop(0,'#090d0e');glow.addColorStop(.25,'#1d2c2c');glow.addColorStop(.5,'#3b5552');glow.addColorStop(.75,'#1d2c2c');glow.addColorStop(1,'#090d0e');
  g.fillStyle=glow;g.fillRect(42,0,172,256);
  for(const x of [63,77,91,105,119,133,147,161,175,189]){g.fillStyle='#5e8b83';g.fillRect(x,0,3,256);}
  g.fillStyle='#d9f2eb';g.fillRect(122,0,6,256);
  g.strokeStyle='#9fc3ba';g.lineWidth=3;
  for(const y of [32,160]){g.beginPath();g.moveTo(104,y+16);g.lineTo(128,y);g.lineTo(152,y+16);g.stroke();}
  for(const x of [8,244]){g.fillStyle='#3e5554';g.fillRect(x,0,3,256);}
  return tex(c);
}
export function pavingTexture(){const {c,g}=canvas(256,256);g.fillStyle='#101212';g.fillRect(0,0,256,256);g.strokeStyle='#292e2f';g.lineWidth=2;g.strokeRect(8,8,240,240);g.strokeRect(28,28,200,200);for(let i=0;i<4;i++){g.fillStyle='#3d4d4a';g.fillRect(40+i*48,0,3,25);g.fillRect(0,40+i*48,25,3);}return tex(c);}
export function groundTexture(){const {c,g}=canvas(128,128);g.fillStyle='#050606';g.fillRect(0,0,128,128);g.strokeStyle='#161a1b';g.lineWidth=1;g.strokeRect(0,0,128,128);g.fillStyle='#38413e';g.fillRect(61,61,5,5);return tex(c);}
export function skyTexture(){const {c,g}=canvas(4,256);const grad=g.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#000000');grad.addColorStop(.5,'#020303');grad.addColorStop(.7,'#080a0a');grad.addColorStop(1,'#000000');g.fillStyle=grad;g.fillRect(0,0,4,256);return tex(c,false);}
export const HORIZON=new THREE.Color('#030505');

/** Soft round dot for glows and sparks. */
export function glowTexture() {
  const S = 64;
  const { c, g } = canvas(S, S);
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.65)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  return tex(c, false);
}

/** Network power badges, rendered once and reused by the instanced pickups. */
export function powerTexture(kind:PowerKind){
  const {c,g}=canvas(128,128);
  const colors:Record<PowerKind,string>={magnet:'#e84a79',shoes:'#248dc2',double:'#cf841d',slipstream:'#10a799',helmet:'#d1a137',cpfp:'#7458cc'};
  const icons:Record<PowerKind,string>={magnet:'∩',shoes:'↑↑',double:'×2',slipstream:'»',helmet:'⌒',cpfp:'+1'};
  g.fillStyle='#d9ffff';round(g,4,4,120,120,25);g.fill();g.fillStyle=colors[kind];round(g,11,11,106,106,19);g.fill();
  g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='900 70px system-ui';g.fillText(icons[kind],64,67);
  return tex(c,false);
}

function round(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** The turquoise upload ramp is the path onto a transaction packet roof. */
export function rampTexture(){const {c,g}=canvas(128,128);g.fillStyle='#0a4a55';g.fillRect(0,0,128,128);g.strokeStyle='#6affed';g.lineWidth=9;for(let y=-64;y<160;y+=64){g.beginPath();g.moveTo(8,y+36);g.lineTo(64,y);g.lineTo(120,y+36);g.stroke();}g.fillStyle='#153240';g.fillRect(0,0,8,128);g.fillRect(120,0,8,128);return tex(c);}
