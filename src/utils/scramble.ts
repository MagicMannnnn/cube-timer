// utils/scramble.ts
// npm i scrambow
import { Scrambow } from 'scrambow';

export type WCAEvent =
  | '333' | '222' | '333oh' | '333bf' | '444' | '555' | '666' | '777'
  | 'pyram' | 'skewb' | 'megaminx' | 'sq1' | 'clock' | '333fm';

const TYPE_MAP: Record<WCAEvent, string> = {
  '333': '333',
  '222': '222',
  '333oh': '333',
  '333bf': '333',
  '333fm': '333',
  '444': '444',
  '555': '555',
  '666': '666',
  '777': '777',
  'pyram': 'pyram',
  'skewb': 'skewb',
  'megaminx': 'minx',
  'sq1': 'sq1',
  'clock': 'clock',
};

export function genScramble(event: WCAEvent = '333'): string {
  const type = TYPE_MAP[event] ?? '333';
  const s = new Scrambow().setType(type).get(1) as Array<{ scramble_string: string }>;
  return (s[0]?.scramble_string ?? '').trim();
}

export function genScrambles(event: WCAEvent, count = 1): string[] {
  const type = TYPE_MAP[event] ?? '333';
  const n = Math.max(1, count);
  const s = new Scrambow().setType(type).get(n) as Array<{ scramble_string: string }>;
  return s.map(x => (x.scramble_string ?? '').trim());
}
