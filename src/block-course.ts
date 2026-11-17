import type { ChainTip } from './live-chain';

export const GENESIS_BLOCK: ChainTip = {
  height: 0,
  hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
};

export function cachedBlock(value: unknown): ChainTip | null {
  if (!value || typeof value !== 'object') return null;
  const { height, hash } = value as Partial<ChainTip>;
  if (typeof height !== 'number' || !Number.isSafeInteger(height) || height < 0 ||
      typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) return null;
  return { height, hash: hash.toLowerCase() };
}

/** The low 32 bits of a verified block hash fit the track generator's seed.
 * The high bits contain the proof-of-work leading zeroes. */
export function blockCourseSeed(hash: string) {
  return Number.parseInt(hash.slice(-8), 16) || 1;
}
