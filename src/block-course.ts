/** The low 32 bits of a verified block hash fit the track generator's seed.
 * The high bits contain the proof-of-work leading zeroes. */
export function blockCourseSeed(hash: string) {
  return Number.parseInt(hash.slice(-8), 16) || 1;
}
