import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seed } from './seed.ts';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  search TEXT NOT NULL,
  brand TEXT,
  source TEXT NOT NULL,
  source_ref TEXT,
  unit TEXT NOT NULL DEFAULT 'g',
  kcal REAL NOT NULL, p REAL NOT NULL, c REAL NOT NULL, g REAL NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  UNIQUE (source, source_ref)
);

CREATE TABLE IF NOT EXISTS off_cache (query TEXT PRIMARY KEY, fetched_at INTEGER NOT NULL, foods TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS dishes (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL,
  kind TEXT NOT NULL,
  short TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  kcal REAL NOT NULL, p REAL NOT NULL, c REAL NOT NULL, g REAL NOT NULL,
  position INTEGER NOT NULL,
  custom INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dish_items (
  id INTEGER PRIMARY KEY,
  dish_id INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  label TEXT NOT NULL,
  kcal REAL NOT NULL, p REAL NOT NULL, c REAL NOT NULL, g REAL NOT NULL,
  swap_key TEXT
);

CREATE TABLE IF NOT EXISTS days (
  date TEXT PRIMARY KEY,
  weight REAL,
  musc INTEGER NOT NULL DEFAULT 0,
  workout_id INTEGER,
  workout_label TEXT,
  activity TEXT NOT NULL DEFAULT 'nenhuma'
);

CREATE TABLE IF NOT EXISTS day_meals (
  date TEXT NOT NULL,
  meal TEXT NOT NULL,
  dish_id INTEGER,
  done INTEGER NOT NULL DEFAULT 0,
  improvised TEXT,
  PRIMARY KEY (date, meal)
);

CREATE TABLE IF NOT EXISTS day_swaps (
  date TEXT NOT NULL,
  meal TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  kcal REAL NOT NULL, p REAL NOT NULL, c REAL NOT NULL, g REAL NOT NULL,
  PRIMARY KEY (date, meal, item_id)
);

CREATE TABLE IF NOT EXISTS measures (date TEXT PRIMARY KEY, belly REAL, navel REAL, arm REAL);

CREATE TABLE IF NOT EXISTS workouts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  muscle TEXT NOT NULL,
  target TEXT NOT NULL,
  rest INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  load TEXT NOT NULL DEFAULT '',
  reps TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS exercise_library (name TEXT PRIMARY KEY, muscle TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  rest_end INTEGER,
  rest_total INTEGER
);

CREATE TABLE IF NOT EXISTS session_sets (
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  set_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  set_index INTEGER NOT NULL,
  load TEXT NOT NULL,
  reps TEXT NOT NULL,
  PRIMARY KEY (session_id, set_id)
);
CREATE INDEX IF NOT EXISTS session_sets_exercise ON session_sets (exercise_id);
`;

const dbPath = process.env.DB_PATH ?? path.resolve(import.meta.dirname, '../data/dieta.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;');
db.exec(SCHEMA);

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getSetting<T>(key: string): T {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) throw new Error(`Configuração ausente: ${key}`);
  return JSON.parse(row.value);
}

export function setSetting(key: string, value: unknown) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}

seed();
