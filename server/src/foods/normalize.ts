/** Lowercase, no accents, no punctuation: the form every search compares against. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'e', 'a', 'o', 'em', 'no', 'na']);

export function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t && !STOP_WORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}
