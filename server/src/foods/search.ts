import type { Food, FoodSource, FoodUnit } from '../../../shared/types.ts';
import { db } from '../db.ts';
import { ALIASES } from './aliases.ts';
import { normalize, tokens } from './normalize.ts';

export interface FoodRow {
  id: number;
  name: string;
  brand: string | null;
  source: FoodSource;
  source_ref: string | null;
  unit: FoodUnit;
  kcal: number;
  p: number;
  c: number;
  g: number;
  uses: number;
}

export function toFood(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    source: row.source,
    sourceRef: row.source_ref,
    unit: row.unit,
    kcal: row.kcal,
    p: row.p,
    c: row.c,
    g: row.g,
  };
}

// Everyday foods first: "frango" should offer grilled breast before fried wing.
const EVERYDAY = new Set(ALIASES.map((a) => a.food));
const EXACT_NAME = new Map(ALIASES.flatMap((a) => a.names.map((name) => [name, a.food])));

function score(row: FoodRow, words: string[], query: string): number {
  const name = normalize(row.name);
  const parts = name.split(' ');
  let total = Math.min(row.uses, 6) * 5 - name.length / 10;
  if (EXACT_NAME.get(query) === row.name) total += 40;
  if (EVERYDAY.has(row.name)) total += 20;
  if (name.startsWith(words[0])) total += 10;
  for (const word of words) if (parts.some((part) => part.startsWith(word))) total += 3;
  return total;
}

export function searchLocal(query: string, limit = 12): Food[] {
  const words = tokens(query);
  if (!words.length) return [];
  const where = words.map(() => 'search LIKE ?').join(' AND ');
  const rows = db.prepare(`SELECT * FROM foods WHERE ${where}`).all(...words.map((w) => `%${w}%`)) as unknown as FoodRow[];
  return rows
    .map((row) => ({ row, rank: score(row, words, normalize(query)) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ row }) => toFood(row));
}

export function findByName(name: string): Food | null {
  const row = db.prepare('SELECT * FROM foods WHERE name = ?').get(name) as FoodRow | undefined;
  return row ? toFood(row) : null;
}

export function saveFood(food: Omit<Food, 'id'>): Food {
  const existing = food.sourceRef
    ? (db.prepare('SELECT * FROM foods WHERE source = ? AND source_ref = ?').get(food.source, food.sourceRef) as FoodRow | undefined)
    : undefined;
  if (existing) return toFood(existing);
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO foods (name, search, brand, source, source_ref, unit, kcal, p, c, g) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(food.name, normalize(`${food.name} ${food.brand ?? ''}`), food.brand, food.source, food.sourceRef, food.unit, food.kcal, food.p, food.c, food.g);
  return { ...food, id: Number(lastInsertRowid) };
}
