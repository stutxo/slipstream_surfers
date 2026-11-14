export const CHARACTERS = [
  { id: 'transaction', name: 'Timmy Transaction', subtitle: 'Non-standard. Still valid.', color: '#f7931a' },
  { id: 'portlandhodl', name: 'PortlandHODL', subtitle: 'Laser eyes. Direct to the miner.', color: '#62dfff' },
  { id: 'ifd', name: 'IFD', subtitle: 'Follow your own route.', color: '#e4ba67' },
  { id: 'peter-todd', name: 'Peter Todd', subtitle: 'Take the private route.', color: '#ec6b60' },
] as const;

export type CharacterId = typeof CHARACTERS[number]['id'];
export const DEFAULT_CHARACTER: CharacterId = 'transaction';

export function characterId(value: unknown): CharacterId {
  return CHARACTERS.some(character => character.id === value) ? value as CharacterId : DEFAULT_CHARACTER;
}

export function characterInfo(id: CharacterId) {
  return CHARACTERS.find(character => character.id === id)!;
}
