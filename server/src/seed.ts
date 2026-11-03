import fs from 'node:fs';
import path from 'node:path';
import type { Cycle, Equivalent, Goals, Macros } from '../../shared/types.ts';
import { db, getSetting, setSetting, transaction } from './db.ts';
import { normalize } from './foods/normalize.ts';

const CYCLE: Cycle = {
  start: '2026-10-31',
  days: 50,
  startWeight: 84.4,
  targetWeight: 81.4,
  weeklyRate: 0.4,
  rateMin: 0.25,
  rateMax: 0.6,
  weeklyWorkouts: 5,
};

const GOALS: Goals = {
  kcal: 2400,
  kcalGame: 2700,
  carbs: 240,
  carbsGame: 300,
  proteinMin: 170,
  proteinMax: 190,
  fatMin: 60,
  fatMax: 70,
};

// The plan's swap table: 180 g of rice equals 360 g of raw potato, 63 g of pasta, etc.
const EQUIVALENTS: Equivalent[] = [
  { key: 'arroz', name: 'Arroz cozido', note: null, unit: 'g', singular: 'arroz cozido', plural: 'arroz cozido', per: { kcal: 1.3, p: 0.025, c: 0.281, g: 0.002 } },
  { key: 'batata', name: 'Batata crua', note: 'airfryer, assada ou cozida', unit: 'g', singular: 'batata crua', plural: 'batata crua', per: { kcal: 0.65, p: 0.018, c: 0.147, g: 0 } },
  { key: 'mandioca', name: 'Mandioca cozida', note: null, unit: 'g', singular: 'mandioca', plural: 'mandioca', per: { kcal: 1.3, p: 0.006, c: 0.301, g: 0.003 } },
  { key: 'massa', name: 'Massa crua', note: null, unit: 'g', singular: 'massa', plural: 'massa', per: { kcal: 3.71, p: 0.1, c: 0.779, g: 0.013 } },
  { key: 'paofrances', name: 'Pão francês', note: null, unit: 'un', singular: 'pão francês', plural: 'pães franceses', per: { kcal: 117, p: 3.1, c: 22.9, g: 1.2 } },
  { key: 'paointegral', name: 'Pão integral', note: null, unit: 'fatia', singular: 'pão integral', plural: 'pão integral', per: { kcal: 67, p: 2.5, c: 13.2, g: 1 } },
];

interface ItemSeed extends Macros {
  label: string;
  swapKey?: string;
}

const item = (label: string, kcal: number, p: number, c: number, g: number, swapKey?: string): ItemSeed => ({ label, kcal, p, c, g, swapKey });

// Per-item values are TACO or label estimates. Dish totals come from the diet plan itself
// and are what the day adds up; a swap only applies the difference between two items.
const YOPRO = item('YoPRO 15 g', 130, 15, 9, 0);
const BANANA = item('1 banana prata', 90, 1.2, 23.7, 0.1);
const PAO_INTEGRAL = item('2 fatias de pão integral', 120, 4.5, 23.5, 1.7, 'paointegral');
const OLEO_5 = item('5 ml de óleo', 44, 0, 0, 5);
const OLEO_10 = item('10 ml de óleo', 88, 0, 0, 10);
const SALADA = item('Salada', 15, 1, 3, 0.2);
const CARNE_140 = item('140 g de carne pronta', 307, 50.3, 0, 10.2);
const CARNE_175 = item('175 g de carne pronta', 384, 62.8, 0, 12.8);
const ARROZ_150 = item('150 g de arroz cozido', 195, 3.8, 42.1, 0.3, 'arroz');
const ARROZ_180 = item('180 g de arroz cozido', 234, 4.5, 50, 0.4, 'arroz');
const ARROZ_200 = item('200 g de arroz cozido', 260, 5, 56.1, 0.5, 'arroz');
const CREME = item('40 g de creme de leite light', 60, 0.8, 2, 5.5);
const KETCHUP = item('20 g de ketchup e mostarda', 20, 0.3, 4.5, 0.1);
const CHAMPIGNON = item('Champignon', 10, 1, 1, 0.1);
const PALHA = item('20 g de batata palha', 108, 1.1, 10.2, 7.3);
const PARMESAO = item('10 g de parmesão', 45, 3.6, 0.2, 3.4);

interface DishSeed extends Macros {
  code: string;
  kind: 'fixed' | 'option' | 'extra';
  short: string;
  name: string;
  summary: string;
  items: ItemSeed[];
}

const DISHES: DishSeed[] = [
  { code: 'cafe', kind: 'fixed', short: 'Café', name: 'Café da manhã', summary: 'Bolo de micro-ondas + YoPRO', kcal: 570, p: 35, c: 74, g: 14, items: [
    item('2 ovos', 145, 13.3, 0.6, 9.5), BANANA, item('45 g de farinha de aveia', 175, 6.3, 30, 3.8), item('8 g de Toddy', 30, 0.3, 7, 0.2), YOPRO,
  ] },
  { code: 'lanche', kind: 'fixed', short: 'Lanche', name: 'Lanche / pré-treino', summary: 'YoPRO, pão integral, paçoquinha', kcal: 345, p: 23, c: 45, g: 7.5, items: [
    YOPRO, PAO_INTEGRAL, item('1 paçoquinha', 95, 3.2, 10.5, 5.2),
  ] },
  { code: 'jogo', kind: 'extra', short: 'Extra de jogo', name: 'Extra de jogo', summary: 'Fixo + extra de jogo', kcal: 275, p: 7.5, c: 56, g: 3, items: [
    BANANA, PAO_INTEGRAL, item('20 g de doce de leite', 65, 1.7, 11.5, 1.3),
  ] },
  { code: '1', kind: 'option', short: 'Carne, arroz e feijão', name: 'Carne + arroz + feijão', summary: 'Carne + arroz + feijão', kcal: 725, p: 58, c: 68, g: 22, items: [
    CARNE_140, ARROZ_180, item('100 g de feijão', 76, 4.8, 13.6, 0.5), item('Salada + 1 colher de chá de azeite', 60, 1, 3, 5), OLEO_5,
  ] },
  { code: '2', kind: 'option', short: 'Carne e batata', name: 'Carne + batata (mais volume)', summary: 'Carne + batata', kcal: 715, p: 69, c: 64, g: 19, items: [
    CARNE_175, item('400 g de batata crua', 260, 7.1, 58.8, 0, 'batata'), item('Legumes à vontade', 30, 2, 5, 0.2), OLEO_5,
  ] },
  { code: '3', kind: 'option', short: 'Carne e arroz', name: 'Carne + arroz', summary: 'Carne + arroz', kcal: 705, p: 66, c: 60, g: 19, items: [
    CARNE_175, ARROZ_200, SALADA, OLEO_5,
  ] },
  { code: '4', kind: 'option', short: 'Hambúrguer e batata', name: 'Hambúrguer de patinho + batata', summary: 'Hambúrguer + batata', kcal: 770, p: 76, c: 57, g: 25, items: [
    item('175 g de hambúrguer de patinho pronto', 384, 62.8, 0, 12.8), item('1 pão de hambúrguer', 140, 5, 25, 2), item('2 fatias de queijo prato', 144, 9, 0.8, 11.6), item('200 g de batata crua na airfryer', 130, 3.5, 29.4, 0, 'batata'),
  ] },
  { code: '5', kind: 'option', short: 'Strogonoff', name: 'Strogonoff + arroz + batata palha', summary: 'Strogonoff + arroz + batata palha', kcal: 735, p: 55, c: 60, g: 28, items: [
    CARNE_140, CREME, KETCHUP, CHAMPIGNON, ARROZ_150, PALHA,
  ] },
  { code: '5b', kind: 'option', short: 'Strogonoff de frango', name: 'Strogonoff de frango', summary: 'Strogonoff de frango', kcal: 650, p: 52, c: 60, g: 20, items: [
    item('140 g de peito de frango pronto', 223, 44.8, 0, 3.5), CREME, KETCHUP, CHAMPIGNON, ARROZ_150, PALHA,
  ] },
  { code: '6', kind: 'option', short: 'Carreteiro seco', name: 'Carreteiro seco', summary: 'Carreteiro seco', kcal: 705, p: 55, c: 66, g: 21, items: [
    item('140 g de carne pronta em cubos', 307, 50.3, 0, 10.2), ARROZ_200, OLEO_10, item('Cebola, alho, tomate e cheiro-verde', 25, 1, 5, 0.1), SALADA,
  ] },
  { code: '7', kind: 'option', short: 'Carreteiro com molho', name: 'Carreteiro com molho', summary: 'Carreteiro com molho', kcal: 715, p: 59, c: 69, g: 19, items: [
    CARNE_140, ARROZ_200, item('100 g de molho de tomate', 38, 1.4, 7.7, 0.9), PARMESAO, OLEO_5,
  ] },
  { code: '8', kind: 'option', short: 'Massa com carne moída', name: 'Massa ao molho vermelho com carne moída', summary: 'Massa com carne moída', kcal: 735, p: 59, c: 78, g: 20, items: [
    item('90 g de massa crua', 334, 9, 70.1, 1.2, 'massa'), item('125 g de patinho moído pronto', 274, 44.9, 0, 9.1), item('150 g de molho de tomate', 58, 2.1, 11.6, 1.4), PARMESAO, OLEO_5,
  ] },
];

// Foods TACO lacks. Milk is listed there without an energy value, so label values stand in.
const LABEL_FOODS: { name: string; unit: 'g' | 'ml'; per100: Macros }[] = [
  { name: 'Refrigerante cola zero', unit: 'ml', per100: { kcal: 0, p: 0, c: 0, g: 0 } },
  { name: 'Leite de vaca integral', unit: 'ml', per100: { kcal: 60, p: 3, c: 4.7, g: 3 } },
  { name: 'Leite de vaca desnatado', unit: 'ml', per100: { kcal: 35, p: 3.2, c: 4.9, g: 0.1 } },
  { name: 'YoPRO 15 g (garrafa 250 g)', unit: 'g', per100: { kcal: 52, p: 6, c: 3.7, g: 0 } },
];

// Each exercise: name, muscle, target reps, rest in seconds, number of sets.
type WorkoutSeed = { name: string; exercises: [string, string, string, number, number][] };

const WORKOUTS: WorkoutSeed[] = [
  { name: 'Push', exercises: [
    ['Supino inclinado com halteres', 'Peito', '6–10', 120, 3],
    ['Supino reto (barra ou máquina)', 'Peito', '6–10', 150, 2],
    ['Crucifixo no cabo ou peck deck', 'Peito', '10–15', 90, 2],
    ['Elevação lateral', 'Ombro', '12–20', 60, 3],
    ['Tríceps testa com barra W', 'Tríceps', '8–12', 90, 3],
    ['Tríceps corda no pulley', 'Tríceps', '10–15', 60, 2],
  ] },
  { name: 'Pull', exercises: [
    ['Puxada alta', 'Costas', '6–10', 120, 3],
    ['Remada com apoio no peito', 'Costas', '8–12', 120, 3],
    ['Crucifixo invertido ou face pull', 'Ombro · Costas', '12–20', 60, 2],
    ['Rosca direta com barra W', 'Bíceps', '6–10', 90, 3],
    ['Rosca inclinada com halteres', 'Bíceps', '8–12', 90, 2],
    ['Rosca martelo', 'Bíceps', '10–12', 60, 2],
  ] },
  { name: 'Legs', exercises: [
    ['Agachamento livre ou hack', 'Quadríceps', '6–10', 180, 3],
    ['Stiff', 'Posterior', '6–10', 150, 3],
    ['Cadeira extensora', 'Quadríceps', '10–15', 90, 2],
    ['Mesa flexora', 'Posterior', '10–15', 90, 2],
    ['Panturrilha em pé', 'Panturrilha', '10–15', 60, 3],
  ] },
  { name: 'Upper', exercises: [
    ['Rosca Scott', 'Bíceps', '8–12', 90, 3],
    ['Tríceps francês no cabo (acima da cabeça)', 'Tríceps', '8–12', 90, 3],
    ['Supino inclinado na máquina ou no Smith', 'Peito', '6–10', 120, 3],
    ['Puxada unilateral ou remada baixa', 'Costas', '8–12', 90, 2],
    ['Paralelas ou supino fechado', 'Peito · Tríceps', '6–10', 120, 2],
    ['Rosca bayesian no cabo (superset)', 'Bíceps', '10–15', 90, 2],
    ['Tríceps unilateral no cabo (superset)', 'Tríceps', '10–15', 90, 2],
    ['Elevação lateral', 'Ombro', '12–20', 60, 2],
  ] },
  { name: 'Lower', exercises: [
    ['Leg press', 'Quadríceps', '8–12', 120, 3],
    ['Flexora sentada', 'Posterior', '10–15', 90, 3],
    ['Búlgaro (cada perna)', 'Quadríceps', '8–12', 90, 2],
    ['Panturrilha sentada', 'Panturrilha', '12–20', 60, 3],
    ['Abdominal no cabo (opcional)', 'Abdômen', '10–15', 60, 2],
  ] },
];

const LIBRARY: [string, string][] = [
  ['Supino declinado', 'Peito'], ['Peck deck', 'Peito'], ['Paralelas', 'Peito · Tríceps'], ['Rosca concentrada', 'Bíceps'],
  ['Face pull', 'Ombro · Costas'], ['Barra fixa', 'Costas'], ['Cadeira extensora', 'Quadríceps'], ['Stiff', 'Posterior'],
];

function seedFoods() {
  const tacoPath = path.resolve(import.meta.dirname, '../data/taco.json');
  const taco = JSON.parse(fs.readFileSync(tacoPath, 'utf8')) as [number, string, string, number, number, number, number][];
  const insert = db.prepare(`INSERT INTO foods (name, search, source, source_ref, unit, kcal, p, c, g) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const [id, name, , kcal, p, c, g] of taco) {
    const unit = /^(Óleo|Azeite|Refrigerante|Cerveja|Café, infusão)|, suco/.test(name) ? 'ml' : 'g';
    insert.run(name, normalize(name), 'TACO', String(id), unit, kcal, p, c, g);
  }
  LABEL_FOODS.forEach(({ name, unit, per100 }, i) => {
    insert.run(name, normalize(name), 'Rótulo', `seed-${i}`, unit, per100.kcal, per100.p, per100.c, per100.g);
  });
}

function seedDishes() {
  const insertDish = db.prepare(`INSERT INTO dishes (code, kind, short, name, summary, kcal, p, c, g, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertItem = db.prepare(`INSERT INTO dish_items (dish_id, position, label, kcal, p, c, g, swap_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const ids: Record<string, number> = {};
  DISHES.forEach((d, position) => {
    const { lastInsertRowid } = insertDish.run(d.code, d.kind, d.short, d.name, d.summary, d.kcal, d.p, d.c, d.g, position);
    ids[d.code] = Number(lastInsertRowid);
    d.items.forEach((it, i) => insertItem.run(ids[d.code], i, it.label, it.kcal, it.p, it.c, it.g, it.swapKey ?? null));
  });
  setSetting('defaults', { cafe: ids.cafe, almoco: ids['1'], lanche: ids.lanche, janta: ids['5'] });
  setSetting('extraDishId', ids.jogo);
}

function seedWorkouts() {
  const insertWorkout = db.prepare('INSERT INTO workouts (name, position) VALUES (?, ?)');
  const insertExercise = db.prepare('INSERT INTO exercises (workout_id, position, name, muscle, target, rest) VALUES (?, ?, ?, ?, ?, ?)');
  const insertSet = db.prepare('INSERT INTO sets (exercise_id, position) VALUES (?, ?)');
  WORKOUTS.forEach((w, wi) => {
    const workoutId = insertWorkout.run(w.name, wi).lastInsertRowid;
    w.exercises.forEach(([name, muscle, target, rest, setCount], ei) => {
      const exerciseId = insertExercise.run(workoutId, ei, name, muscle, target, rest).lastInsertRowid;
      for (let si = 0; si < setCount; si++) insertSet.run(exerciseId, si);
    });
  });
  const insertLibrary = db.prepare('INSERT INTO exercise_library (name, muscle) VALUES (?, ?)');
  LIBRARY.forEach(([name, muscle]) => insertLibrary.run(name, muscle));
}

export function seed() {
  const seeded = db.prepare(`SELECT 1 FROM settings WHERE key = 'cycle'`).get();
  if (seeded) return;
  transaction(() => {
    setSetting('cycle', CYCLE);
    setSetting('goals', GOALS);
    setSetting('equivalents', EQUIVALENTS);
    seedFoods();
    seedDishes();
    seedWorkouts();
    // Week 0 baseline from the plan. The cycle opened with Legs, so the rotation continues from there.
    const legs = db.prepare(`SELECT id FROM workouts WHERE name = 'Legs'`).get() as { id: number };
    db.prepare(`INSERT INTO days (date, weight, musc, workout_id, workout_label) VALUES (?, ?, 1, ?, 'Treino C · Legs')`).run(CYCLE.start, CYCLE.startWeight, legs.id);
    db.prepare('INSERT INTO measures (date, belly, navel, arm) VALUES (?, 85, 92, 34.5)').run(CYCLE.start);
  });
  console.log(`Banco criado com o plano do ciclo (${getSetting<Cycle>('cycle').days} dias).`);
}
