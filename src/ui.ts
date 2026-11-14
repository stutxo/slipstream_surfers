// The DOM layer: title screen, HUD, pause and result screens. Plain elements, no framework.
import { t, getLang, setLang, LANGS, LANG_LABEL, type Key } from './i18n';
import type { PowerKind } from './sim/types';
import { POWER_TIME, SLIPSTREAM_EXIT_WARNING } from './config';
import { CHARACTERS, DEFAULT_CHARACTER, characterInfo, type CharacterId } from './characters';

export type Screen = 'start' | 'play' | 'pause' | 'over';
export interface UIHandlers {
  play(): void;
  resume(): void;
  pause(): void;
  restart(): void;
  home(): void;
  toggleMute(): void;
  langChanged(): void;
  selectCharacter(id: CharacterId): void;
}

const ICON = {
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  muted: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  coin: '<span class="coin-ico"></span>',
};
const POWER_ICON: Record<PowerKind, string> = { magnet: '∪', shoes: '⇧', double: '×2', slipstream: '≋', helmet: '◠', cpfp: '»' };

export class UI {
  root: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  screen: Screen = 'start';
  private hintTimer = 0;
  private toastTimer = 0;
  touch = matchMedia('(pointer: coarse)').matches;
  private last = { score: -1, coins: -1, mult: -1, power: '' };

  constructor(root: HTMLElement, h: UIHandlers, muted: boolean) {
    this.root = root;
    root.innerHTML = `
      <div class="hud" id="hud">
        <div class="network-label"><img class="brand-logo" src="./assets/brand/slipstream-logo.svg" alt="MARA Slipstream" width="455" height="109"><span>SURFERS / BITCOIN</span></div>
        <div class="route-status" id="route-status">PUBLIC MEMPOOL <i></i> SURVEILLANCE ACTIVE</div>
        <div class="hud-left">
          <button class="icon-btn" id="btn-pause" aria-label="pause">${ICON.pause}</button>
          <button class="icon-btn" id="btn-mute" aria-label="mute"></button>
        </div>
        <div class="hud-right">
          <div class="score" id="score">0</div>
          <div class="hud-row"><span class="mult" id="mult">×1</span><span class="coins">${ICON.coin}<b id="coins">0</b></span></div>
          <div class="powers" id="powers"></div>
        </div>
        <div class="hint" id="hint"></div>
        <div class="toast" id="toast"></div>
      </div>
      <div class="flash" id="flash"></div>
      <section class="screen start" id="s-start">
        <div class="panel">
          <h1 class="brand-title"><img class="brand-logo" src="./assets/brand/slipstream-logo.svg" alt="MARA Slipstream" width="455" height="109"><span>SURFERS</span></h1>
          <p class="tag" data-k="tagline"></p>
          <div class="mission">Your transaction. A direct route to the miner.<br>Surf mining racks. Dodge the filters. Stack sats.</div>
          <div class="stats"><div><small data-k="best"></small><b id="best">0</b></div><div><small data-k="coinsTotal"></small><b id="bank">0</b></div></div>
          <div class="character-picker" id="character-picker">
            <div class="character-heading"><span id="character-heading">CHOOSE YOUR SURFER</span><span>01 — 04</span></div>
            <div class="character-options" role="group" aria-labelledby="character-heading">
              ${CHARACTERS.map(character => `<button type="button" class="character-choice" id="character-${character.id}" data-character="${character.id}" style="--character-color:${character.color}" aria-label="Select ${character.name}" aria-pressed="false">
                <span class="character-portrait"><img id="portrait-${character.id}" alt="" width="160" height="160" hidden><span class="portrait-placeholder" aria-hidden="true">${character.id === 'transaction' ? '₿' : character.name === 'Peter Todd' ? 'PT' : character.name === 'PortlandHODL' ? 'PH' : 'IFD'}</span><span class="character-check" aria-hidden="true">✓</span></span>
                <span class="character-name">${character.name}</span>
              </button>`).join('')}
            </div>
            <p class="character-detail" id="character-detail" aria-live="polite"><b id="character-selected"></b><span id="character-subtitle"></span></p>
          </div>
          <button class="big" id="btn-play" data-k="play"></button>
          <p class="ctrl" id="ctrl"></p>
          <div class="row">
            <button class="chip" id="btn-lang" hidden></button><a class="chip link" href="https://slipstream.mara.com/" target="_blank" rel="noopener">SLIPSTREAM ↗</a>
            <button class="chip" id="btn-mute2"></button>
          </div>
        </div>
        <div class="field-guide"><div><b>01 / MINING RACK SURFING</b><span>Take the ramps. Link the rooftops.</span></div><div><b>02 / DODGE THE FILTERS</b><span>Jump fees. Slide under eyes.</span></div><div><b>03 / GO SLIPSTREAM</b><span>Private tunnel to the miner.</span></div></div>
      </section>
      <section class="screen pause" id="s-pause">
        <div class="panel">
          <h2 data-k="paused"></h2>
          <button class="big" id="btn-resume" data-k="resume"></button>
          <button class="ghost" id="btn-restart" data-k="restart"></button>
          <button class="ghost" id="btn-home" data-k="home"></button>
        </div>
      </section>
      <section class="screen over" id="s-over">
        <div class="panel">
          <h2 id="result-title" data-k="over"></h2><p class="catch-line" id="result-message">“Please explain the source of these sats.”</p>
          <div class="badge" id="newbest" data-k="newBest"></div>
          <div class="result">
            <div><small data-k="score"></small><b id="r-score">0</b></div>
            <div><small data-k="coins"></small><b id="r-coins">0</b></div>
            <div><small data-k="distance"></small><b id="r-dist">0</b></div>
            <div><small data-k="best"></small><b id="r-best">0</b></div>
          </div>
          <button class="big" id="btn-again" data-k="again"></button>
          <button class="ghost" id="btn-home2" data-k="home"></button>
        </div>
      </section>`;
    root.querySelectorAll<HTMLElement>('[id]').forEach((e) => (this.el[e.id] = e));
    const tap = (id: string, fn: () => void) => this.el[id].addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    tap('btn-play', () => h.play());
    tap('btn-pause', () => h.pause());
    tap('btn-resume', () => h.resume());
    tap('btn-restart', () => h.restart());
    tap('btn-home', () => h.home());
    tap('btn-home2', () => h.home());
    tap('btn-again', () => h.restart());
    tap('btn-mute', () => h.toggleMute());
    tap('btn-mute2', () => h.toggleMute());
    const select = (id: CharacterId) => { this.setCharacter(id); h.selectCharacter(id); };
    for (const character of CHARACTERS) {
      const button = this.el['character-' + character.id];
      tap('character-' + character.id, () => select(character.id));
      button.addEventListener('keydown', (event) => {
        const index = CHARACTERS.findIndex(item => item.id === character.id);
        const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
        if (!delta && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        event.stopPropagation();
        const next = CHARACTERS[event.key === 'Home' ? 0 : event.key === 'End' ? CHARACTERS.length - 1 : (index + delta + CHARACTERS.length) % CHARACTERS.length];
        select(next.id);
        this.el['character-' + next.id].focus({ preventScroll: true });
      });
    }
    tap('btn-lang', () => {
      const i = LANGS.indexOf(getLang());
      setLang(LANGS[(i + 1) % LANGS.length]);
      this.texts();
      h.langChanged();
    });
    // tap anywhere on the title screen panel background starts too
    this.el['s-start'].addEventListener('click', (e) => { if (e.target === this.el['s-start']) h.play(); });
    for (const b of root.querySelectorAll('button')) b.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.setMuted(muted);
    this.setCharacter(DEFAULT_CHARACTER);
    this.texts();
  }

  setCharacter(id: CharacterId) {
    const selected = characterInfo(id);
    for (const character of CHARACTERS) {
      const active = character.id === id;
      const button = this.el['character-' + character.id];
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('selected', active);
    }
    this.el['character-selected'].textContent = selected.name;
    this.el['character-subtitle'].textContent = selected.subtitle;
    this.el['character-picker'].style.setProperty('--selected-color', selected.color);
    this.root.dataset.character = id;
  }

  setCharacterPortraits(portraits: Record<CharacterId, string>) {
    for (const character of CHARACTERS) {
      const image = this.el['portrait-' + character.id] as HTMLImageElement;
      image.src = portraits[character.id];
      image.hidden = false;
      this.el['character-' + character.id].classList.add('has-portrait');
    }
  }

  texts() {
    document.documentElement.lang = getLang();
    document.title = t('title');
    this.root.querySelectorAll<HTMLElement>('[data-k]').forEach((e) => (e.textContent = t(e.dataset.k as Key)));
    this.el.ctrl.textContent = this.touch ? t('ctrlTouch') : t('ctrlKeys');
    this.el['btn-lang'].textContent = t('lang') + ' · ' + LANG_LABEL[getLang()];
  }

  setMuted(m: boolean) {
    this.el['btn-mute'].setAttribute('aria-label', m ? 'Turn sound on' : 'Turn sound off');
    this.el['btn-mute'].innerHTML = m ? ICON.muted : ICON.sound;
    this.el['btn-mute2'].innerHTML = (m ? ICON.muted : ICON.sound) + `<span>${t(m ? 'mute' : 'sound')}</span>`;
  }

  show(s: Screen) {
    this.screen = s;
    this.root.dataset.screen = s;
    for (const k of ['start', 'pause', 'over'] as const) this.el['s-' + k].classList.toggle('on', s === k);
    this.el.hud.classList.toggle('on', s === 'play' || s === 'pause');
    if (s !== 'play') this.hint('');
    if (s === 'start') this.el['btn-play'].focus({ preventScroll: true });
    if (s === 'over') this.el['btn-again'].focus({ preventScroll: true });
    if (s === 'pause') this.el['btn-resume'].focus({ preventScroll: true });
  }

  setStart(best: number, bank: number) {
    this.el.best.textContent = String(best);
    this.el.bank.textContent = String(bank);
  }

  hud(score: number, coins: number, mult: number, power: Record<PowerKind, number>) {
    if (score !== this.last.score) {
      this.el.score.textContent = String(score).padStart(6, '0');
      this.last.score = score;
    }
    if (coins !== this.last.coins) {
      this.el.coins.textContent = String(coins);
      this.last.coins = coins;
      this.el.coins.parentElement!.classList.remove('pop');
      void this.el.coins.offsetWidth;
      this.el.coins.parentElement!.classList.add('pop');
    }
    if (mult !== this.last.mult) {
      this.el.mult.textContent = '×' + mult;
      this.el.mult.classList.toggle('hot', mult > 1);
      this.last.mult = mult;
    }
    const key = (Object.keys(power) as PowerKind[]).map((k) => (power[k] > 0 ? k + Math.ceil(power[k] * 10) : '')).join();
    if (key !== this.last.power) {
      this.last.power = key;
      this.el.powers.innerHTML = (Object.keys(power) as PowerKind[])
        .filter((k) => power[k] > 0)
        .map((k) => `<div class="pw ${k}"><i>${POWER_ICON[k]}</i><span>${t(k)}</span><em style="transform:scaleX(${(power[k] / POWER_TIME[k]).toFixed(3)})"></em></div>`)
        .join('');
    }
  }

  status(distance: number, slipstreamSeconds: number, exitGrace: number) {
    const privateRoute = slipstreamSeconds > 0;
    const exiting = privateRoute && slipstreamSeconds <= SLIPSTREAM_EXIT_WARNING;
    const label = privateRoute
      ? exiting ? `EXIT IN ${Math.ceil(slipstreamSeconds)}s <i class="private"></i> CHOOSE YOUR LANE`
        : 'PRIVATE ROUTE <i class="private"></i> HAZARD PROTECTION'
      : exitGrace > 0 ? `EXIT SHIELD ${exitGrace.toFixed(1)}s <i class="private"></i> PREPARE TO DODGE`
        : 'PUBLIC MEMPOOL <i></i> SURVEILLANCE ACTIVE';
    this.el['route-status'].innerHTML = `${label} <b>${Math.floor(distance)} m</b>`;
    this.root.dataset.route = privateRoute ? (exiting ? 'exiting' : 'private') : exitGrace > 0 ? 'shield' : 'public';
  }

  hint(text: string, ms = 2200) {
    const e = this.el.hint;
    window.clearTimeout(this.hintTimer);
    e.textContent = text;
    e.classList.toggle('on', !!text);
    if (text) this.hintTimer = window.setTimeout(() => e.classList.remove('on'), ms);
  }

  toast(text: string, ms = 1400) {
    const e = this.el.toast;
    window.clearTimeout(this.toastTimer);
    e.textContent = text;
    e.classList.add('on');
    this.toastTimer = window.setTimeout(() => e.classList.remove('on'), ms);
  }

  flash(kind: 'hit' | 'crash' | 'power') {
    const e = this.el.flash;
    e.className = 'flash';
    void e.offsetWidth;
    e.className = 'flash ' + kind;
  }

  result(r: { score: number; coins: number; distance: number; best: number; newBest: boolean }) {
    this.el['r-score'].textContent = String(r.score);
    this.el['r-coins'].textContent = String(r.coins);
    this.el['r-dist'].textContent = r.distance + ' ' + t('meters');
    this.el['r-best'].textContent = String(r.best);
    this.el.newbest.classList.toggle('on', r.newBest);
  }
}
