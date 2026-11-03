import type { ExternalSearch, Food } from '../../../shared/types.ts';
import { db } from '../db.ts';
import { normalize } from './normalize.ts';

const ENDPOINT = 'https://search.openfoodfacts.org/search';
const FIELDS = 'code,product_name,brands,nutriments,quantity';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const TIMEOUT = 6000;
// Open Food Facts allows 10 searches a minute. Stay under it rather than get blocked.
const MAX_PER_MINUTE = 9;

// They ask for an identifying User-Agent. Set OFF_USER_AGENT to add a contact if you want one.
const USER_AGENT = process.env.OFF_USER_AGENT ?? 'CuttingApp/1.0 (uso pessoal)';

let recent: number[] = [];

function underLimit(): boolean {
  const now = Date.now();
  recent = recent.filter((t) => now - t < 60000);
  return recent.length < MAX_PER_MINUTE;
}

interface OffHit {
  code?: string;
  product_name?: unknown;
  brands?: unknown;
  quantity?: unknown;
  nutriments?: Record<string, unknown>;
}

const number = (value: unknown): number | null => {
  const n = Number(value);
  return value === undefined || value === null || value === '' || !Number.isFinite(n) ? null : n;
};

const round = (n: number) => Math.round(n * 10) / 10;

export function mapHit(hit: OffHit): Food | null {
  const name = typeof hit.product_name === 'string' ? hit.product_name.trim() : '';
  const n = hit.nutriments ?? {};
  const energyKj = number(n.energy_100g);
  const kcal = number(n['energy-kcal_100g']) ?? (energyKj === null ? null : energyKj / 4.184);
  if (!name || !hit.code || kcal === null || kcal < 0 || kcal > 950) return null;
  const brands = Array.isArray(hit.brands) ? hit.brands.join(', ') : typeof hit.brands === 'string' ? hit.brands : '';
  const liquid = typeof hit.quantity === 'string' && /\d\s*(ml|cl|l)\b/i.test(hit.quantity);
  return {
    id: null,
    name: name.slice(0, 120),
    brand: brands.slice(0, 80) || null,
    source: 'Open Food Facts',
    sourceRef: String(hit.code).slice(0, 32),
    unit: liquid ? 'ml' : 'g',
    kcal: round(kcal),
    p: round(number(n.proteins_100g) ?? 0),
    c: round(number(n.carbohydrates_100g) ?? 0),
    g: round(number(n.fat_100g) ?? 0),
  };
}

async function fetchHits(query: string): Promise<Food[]> {
  const url = `${ENDPOINT}?${new URLSearchParams({ q: query, page_size: '10', fields: FIELDS })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`Open Food Facts respondeu ${res.status}`);
  const data = (await res.json()) as { hits?: OffHit[] };
  return (data.hits ?? []).map(mapHit).filter((food): food is Food => food !== null);
}

export async function searchOff(query: string): Promise<ExternalSearch> {
  const key = normalize(query);
  if (key.length < 3) return { foods: [], limited: false, failed: false };

  const cached = db.prepare('SELECT fetched_at, foods FROM off_cache WHERE query = ?').get(key) as { fetched_at: number; foods: string } | undefined;
  if (cached && Date.now() - cached.fetched_at < CACHE_TTL) {
    return { foods: JSON.parse(cached.foods), limited: false, failed: false };
  }
  if (!underLimit()) return { foods: [], limited: true, failed: false };

  try {
    recent.push(Date.now());
    let foods = await fetchHits(`${query} countries_tags:"en:brazil"`);
    if (!foods.length && underLimit()) {
      recent.push(Date.now());
      foods = await fetchHits(query);
    }
    db.prepare('INSERT OR REPLACE INTO off_cache (query, fetched_at, foods) VALUES (?, ?, ?)').run(key, Date.now(), JSON.stringify(foods));
    return { foods, limited: false, failed: false };
  } catch (err) {
    console.warn('Open Food Facts indisponível:', (err as Error).message);
    return { foods: [], limited: false, failed: true };
  }
}
