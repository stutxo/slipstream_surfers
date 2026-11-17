// Slipstream edition copy. The upstream i18n API is retained for its UI integration.
export type Lang = 'en';
const words = {
  title: 'Slipstream Surfers', tagline: 'Too interesting for the public mempool.', best: 'Best run', coinsTotal: 'Sats stacked',
  ctrlKeys: '← → / A D switch cable · ↑ W Space jump · ↓ S slide · P pause', ctrlTouch: 'Swipe to switch cables · swipe up to jump · down to slide',
  tapToStart: 'Press Space to start', paused: 'Transmission paused', resume: 'Keep surfing →', home: 'Back to network',
  over: 'Trace complete.', score: 'Score', coins: 'Sats', distance: 'Distance', newBest: 'New network record',
  preparing: 'Connecting to the network…', loading: 'Loading', loadFail: 'Connection failed. Please refresh.',
  hintJumpKeys: '↑ Jump the fee spike', hintJumpTouch: 'Swipe up — fee spike ahead', hintSlideKeys: '↓ Slide beneath the scanner', hintSlideTouch: 'Swipe down — scanner ahead',
  hintLaneKeys: '← → Dodge the policy checkpoint', hintLaneTouch: 'Switch cables to dodge', hintRamp: 'Take the ramp. Surf the mining racks.',
  magnet: 'Sat magnet', shoes: 'Script boost', double: 'Batching ×2', slipstream: 'Slipstream tunnel', helmet: 'Mining helmet', cpfp: 'CPFP boost',
  careful: 'Surveillance is closing in. Find another route.', mute: 'Sound off', sound: 'Sound on', mult: 'Batch multiplier', meters: 'm', lang: 'Language',
};
export type Key = keyof typeof words;
export const getLang = (): Lang => 'en';
export function setLang(_l: Lang) { document.documentElement.lang = 'en'; }
export const t = (k: Key) => words[k];
export const LANGS: Lang[] = ['en'];
export const LANG_LABEL: Record<Lang, string> = { en: 'EN' };
