import type { Food, ParsedRow } from '../../../shared/types.ts';
import { ALIASES, type Alias } from './aliases.ts';
import { searchOff } from './off.ts';
import { findByName, searchLocal } from './search.ts';

const MAX_EXTERNAL_LOOKUPS = 3;

const WORD_NUMBERS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, meio: 0.5, meia: 0.5,
};
const COUNT = '\\d+(?:\\.\\d+)?|um|uma|dois|duas|tres|quatro|cinco|seis|meio|meia';

// Household measures, in grams or ml. Null means "one piece of this food".
const MEASURES: [RegExp, number | null][] = [
  [/^colher(?:es)? de cha(?: de)?\s+/, 5],
  [/^colher(?:es)?(?: de sopa)?(?: de)?\s+/, 15],
  [/^conchas?(?: de)?\s+/, 100],
  [/^(?:xicaras?|copos?)(?: de)?\s+/, 200],
  [/^latas?(?: de)?\s+/, 350],
  [/^garrafas?(?: de)?\s+/, 600],
  [/^(?:fatias?|unidades?|un|pedacos?|bifes?|files?)(?: de)?\s+/, null],
];

const clean = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const toNumber = (word: string) => WORD_NUMBERS[word] ?? Number(word);

const ALIAS_NAMES = ALIASES.flatMap((alias) => alias.names.map((name) => ({ name, alias }))).sort((a, b) => b.name.length - a.name.length);

function singular(text: string): string {
  return text
    .split(' ')
    .map((word) => {
      if (word === 'paes') return 'pao';
      return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
    })
    .join(' ');
}

function findAlias(text: string): Alias | null {
  const haystack = ` ${singular(text.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim())} `;
  return ALIAS_NAMES.find(({ name }) => haystack.includes(` ${name} `))?.alias ?? null;
}

export function splitSegments(text: string): string[] {
  let body = clean(text).replace(/(\d)[.,](\d)/g, '$1#$2');
  // "PF no restaurante: ..." — what precedes the colon is context, not food.
  const colon = body.indexOf(':');
  if (colon >= 0 && colon < 40) body = body.slice(colon + 1);
  return body
    .replace(/\b(mais ou menos|cerca de|aproximadamente|aprox|quase|tipo)\b/g, ' ')
    .split(/[,;.!?\n+]|\be\b|\bcom\b|\bmais\b/)
    .map((part) => part.replace(/#/g, '.').trim())
    .filter(Boolean);
}

interface Amount {
  rest: string;
  explicit: number | null;
  count: number | null;
  measure: number | null;
  factor: number;
}

export function readAmount(segment: string): Amount {
  let rest = segment.replace(/\b(uns|umas|so|apenas|tinha|comi|tomei|bebi)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const amount: Amount = { rest, explicit: null, count: null, measure: null, factor: 1 };

  const weight = rest.match(/(\d+(?:\.\d+)?)\s*(kg|kilos?|quilos?|gramas?|grs?|g|ml|litros?|l)\b/);
  if (weight) {
    const value = Number(weight[1]);
    amount.explicit = /^(kg|kilo|quilo|l$|litro)/.test(weight[2]) ? value * 1000 : value;
    rest = rest.replace(weight[0], ' ');
  }

  const little = /\b(um pouco|um pouquinho|pouquinho|pouco)\b/;
  const lots = /\b(bastante|muito|um montao)\b/;
  if (little.test(rest)) {
    amount.factor = 0.5;
    rest = rest.replace(little, ' ');
  } else if (lots.test(rest)) {
    amount.factor = 1.5;
    rest = rest.replace(lots, ' ');
  }

  rest = rest.replace(/\s+/g, ' ').trim();
  const counted = amount.explicit === null ? rest.match(new RegExp(`^(${COUNT})\\s+(.+)$`)) : null;
  if (counted) {
    amount.count = toNumber(counted[1]);
    rest = counted[2];
    for (const [pattern, size] of MEASURES) {
      if (pattern.test(rest)) {
        rest = rest.replace(pattern, '');
        amount.measure = size;
        break;
      }
    }
  }

  amount.rest = rest.replace(/^(de|do|da|dos|das|no|na)\s+/, '').trim();
  return amount;
}

function quantity(amount: Amount, alias: Alias | null): number {
  if (amount.explicit !== null) return amount.explicit;
  const portion = alias?.portion ?? 100;
  const each = alias?.each ?? portion;
  if (amount.count !== null) return Math.round(amount.count * (amount.measure ?? each));
  return Math.round(portion * amount.factor);
}

export async function parseMeal(text: string): Promise<ParsedRow[]> {
  const rows: ParsedRow[] = [];
  for (const segment of splitSegments(text)) {
    const amount = readAmount(segment);
    if (!amount.rest) continue;
    const alias = findAlias(amount.rest);
    const food: Food | null = (alias && findByName(alias.food)) ?? searchLocal(amount.rest, 1)[0] ?? null;
    rows.push({ text: amount.rest, qty: quantity(amount, alias), unit: food?.unit ?? 'g', food });
  }

  // Brands and packaged products TACO has never heard of. The first hit can be off,
  // but it is labeled with its source and the row stays editable.
  const missing = rows.filter((row) => !row.food).slice(0, MAX_EXTERNAL_LOOKUPS);
  await Promise.all(
    missing.map(async (row) => {
      const { foods } = await searchOff(row.text);
      if (foods[0]) {
        row.food = foods[0];
        row.unit = foods[0].unit;
      }
    }),
  );

  return rows;
}
