// Canvas composition makes the downloaded replay include the HUD, without screen permissions.
import type { Sim } from './sim/sim';
export class ReplayRecorder {
  private logo = new Image();
  constructor() { this.logo.src = './assets/brand/slipstream-logo.svg'; }
  private output = document.createElement('canvas');
  private ctx = this.output.getContext('2d')!;
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private url = '';
  active = false;
  start(source: HTMLCanvasElement, audio: MediaStream | null, done: (url: string, extension: string) => void) {
    if (typeof MediaRecorder === 'undefined') return false;
    this.output.width = Math.round(Math.min(source.clientWidth, 1440) / 2) * 2;
    this.output.height = Math.round(this.output.width * source.clientHeight / source.clientWidth / 2) * 2;
    this.stream = this.output.captureStream(30);
    for (const track of audio?.getAudioTracks() || []) this.stream.addTrack(track.clone());
    const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
    try { this.recorder = new MediaRecorder(this.stream, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 6500000 }); }
    catch { this.stream.getTracks().forEach(t => t.stop()); return false; }
    this.chunks = [];
    this.recorder.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.onstop = () => {
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(new Blob(this.chunks, { type: this.recorder?.mimeType || 'video/webm' }));
      this.stream?.getTracks().forEach(t => t.stop()); done(this.url, this.recorder?.mimeType.includes('mp4') ? 'mp4' : 'webm');
    };
    this.recorder.start(500); this.active = true; return true;
  }
  frame(source: HTMLCanvasElement, sim: Sim, delivered: boolean) {
    if (!this.active) return;
    const c = this.ctx, w = this.output.width, h = this.output.height, scale = w / 720;
    c.drawImage(source, 0, 0, w, h);
    c.save();c.scale(scale,scale);
    const H=h/scale;
    c.fillStyle='#101010e8'; c.fillRect(0,0,720,122);
    if(this.logo.complete && this.logo.naturalWidth) c.drawImage(this.logo,26,17,235,235*109/455);
    else { c.fillStyle='#fff';c.font='italic 900 33px sans-serif';c.fillText('SLIPSTREAM',26,55); }
    c.fillStyle='#ddd';c.font='12px "Roboto Mono", monospace';c.fillText('SURFERS / BITCOIN',28,97);
    c.textAlign='right';c.fillStyle='#fff';c.font='28px "Roboto Mono", monospace';c.fillText(String(Math.floor(sim.score)).padStart(6,'0'),690,49);
    c.fillStyle='#ffa84d';c.font='17px "Roboto Mono", monospace';c.fillText('₿ '+sim.coins+' SATS',690,78);
    c.textAlign='center';c.fillStyle='#101010e8';c.fillRect(0,H-82,720,82);
    c.fillStyle=sim.power.slipstream>0?'#67f5dc':'#dddddd';c.font='14px "Roboto Mono", monospace';c.fillText(sim.power.slipstream>0?'SLIPSTREAM / PRIVATE ROUTE TO MINER':'SURF THE CABLES · DODGE THE FILTERS',360,H-45);
    c.font='11px monospace';c.fillText('DEMO RUN  /  '+Math.floor(sim.d)+' m',360,H-22);
    if(delivered){c.fillStyle='#101010e8';c.fillRect(55,H/2-100,610,200);c.fillStyle='#67f5dc';c.font='900 33px system-ui';c.fillText('DELIVERED TO THE MINER.',360,H/2-12);c.fillStyle='#fff';c.font='17px monospace';c.fillText('Non-standard. Still valid.',360,H/2+28);}
    c.restore();
  }
  stop(){if(this.active){this.active=false;this.recorder?.stop();}}
}
