// Pure helpers shared by the Firestore layer and the screens; no Firebase imports
// here so they can be unit tested in Node.

/** No 0/O, 1/I/L: the code is read aloud and typed on a phone. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function generateCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

/** Upper-cases and drops anything that cannot be part of a code (spaces, dashes). */
export function cleanCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/** Lower-case, no diacritics, single spaces: "  Mlijeko 2,8% " → "mlijeko 2,8%". Used as history key. */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

/** Firestore document ids cannot contain "/". */
export function historyKey(name: string): string {
  return normalizeName(name).replace(/\//g, '-') || '-';
}

/** Store sections in the order they are usually walked through. */
export const CATEGORIES = [
  'Voće i povrće',
  'Pekara',
  'Mliječni proizvodi',
  'Meso i riba',
  'Smrznuto',
  'Piće',
  'Kućna kemija',
  'Higijena',
  'Ostalo',
] as const;

export type Category = (typeof CATEGORIES)[number];

// Word stems matched against the start of each word of the item name.
const KEYWORDS: Record<Exclude<Category, 'Ostalo'>, string[]> = {
  'Voće i povrće': [
    'jabuk', 'banan', 'naranc', 'limun', 'mandarin', 'grozd', 'jagod', 'borovnic', 'kruska', 'kruske',
    'breskv', 'lubenic', 'dinj', 'kivi', 'avokad', 'krumpir', 'luk', 'cesnjak', 'mrkv', 'rajcic', 'paradajz',
    'krastav', 'paprik', 'salat', 'kupus', 'brokul', 'tikvic', 'patlidzan', 'spinat', 'blitv', 'gljiv', 'persin',
    'celer', 'poriluk', 'cikl', 'rotkvic', 'voce', 'povrce',
  ],
  Pekara: ['kruh', 'pecivo', 'kifl', 'burek', 'baget', 'zemick', 'tost', 'lepinj', 'krafn', 'croissant', 'kroasan', 'pita'],
  'Mliječni proizvodi': [
    'mlijek', 'jogurt', 'sir', 'svjezi', 'vrhnj', 'maslac', 'kefir', 'skyr', 'mozzarell', 'gauda', 'ementaler',
    'parmezan', 'feta', 'margarin', 'puding', 'jaja', 'jaje', 'kiselo',
  ],
  'Meso i riba': [
    'meso', 'piletin', 'pileca', 'pileci', 'puretin', 'pureca', 'junetin', 'svinjetin', 'mljeveno', 'kobasic',
    'hrenovk', 'sunk', 'salam', 'slanin', 'pancet', 'cevap', 'riba', 'tuna', 'losos', 'oslic', 'srdel', 'skamp',
    'pasteta',
  ],
  Smrznuto: ['smrznut', 'sladoled', 'pomfrit', 'grasak', 'pizza', 'led'],
  'Piće': [
    'voda', 'mineraln', 'sok', 'pivo', 'piva', 'vino', 'cola', 'coca', 'fanta', 'sprite', 'kava', 'caj', 'energet',
    'red bull', 'rakij', 'cedevit',
  ],
  'Kućna kemija': [
    'deterdzent', 'omeksivac', 'prasak', 'spuzv', 'krpa', 'krpe', 'vrec', 'folij', 'papirnat', 'ubrus', 'sredstvo',
    'cistac', 'domestos', 'jar', 'tablete za', 'baterij', 'zarulj', 'aluminij',
  ],
  Higijena: [
    'sampon', 'gel', 'sapun', 'pasta za', 'cetkic', 'zubn', 'toaletn', 'wc papir', 'dezodorans', 'brijac', 'pjena',
    'krema', 'ulosk', 'tampon', 'pelen', 'maramic', 'stapic', 'vata',
  ],
};

/** Best-effort shop section for an item name; "Ostalo" when nothing matches. */
export function guessCategory(name: string): Category {
  const n = normalizeName(name);
  const words = n.split(/[^a-z0-9%]+/).filter(Boolean);
  for (const [category, stems] of Object.entries(KEYWORDS) as [Category, string[]][]) {
    for (const stem of stems) {
      if (stem.includes(' ') ? n.includes(stem) : words.some((w) => w.startsWith(stem))) return category;
    }
  }
  return 'Ostalo';
}
