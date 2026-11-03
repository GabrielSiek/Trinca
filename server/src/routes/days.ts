import type { ActivityId, Cycle, Day, DayMeal, LoggedItem, MealId, Swap } from '../../../shared/types.ts';
import { db, getSetting } from '../db.ts';
import { badRequest, optionalNumber, requireDate, requireId, requireNumber, requireText, type Router } from '../http.ts';
import { nextDueLabel } from './training.ts';
import { parseItems } from './plan.ts';

const MEALS: MealId[] = ['cafe', 'almoco', 'lanche', 'janta'];
const ACTIVITIES: ActivityId[] = ['nenhuma', 'basquete', 'futebol', 'outra'];

interface DayRow {
  date: string;
  weight: number | null;
  musc: number;
  workout_id: number | null;
  workout_label: string | null;
  activity: ActivityId;
}

interface MealRow {
  meal: MealId;
  dish_id: number | null;
  done: number;
  improvised: string | null;
}

interface SwapRow {
  meal: MealId;
  item_id: number;
  label: string;
  kcal: number;
  p: number;
  c: number;
  g: number;
}

function requireMeal(value: string): MealId {
  if (!MEALS.includes(value as MealId)) badRequest('Refeição inválida');
  return value as MealId;
}

export function ensureDay(date: string) {
  db.prepare('INSERT OR IGNORE INTO days (date) VALUES (?)').run(date);
}

export function loadDay(date: string): Day {
  const row = db.prepare('SELECT * FROM days WHERE date = ?').get(date) as DayRow | undefined;
  const mealRows = db.prepare('SELECT * FROM day_meals WHERE date = ?').all(date) as unknown as MealRow[];
  const swapRows = db.prepare('SELECT * FROM day_swaps WHERE date = ?').all(date) as unknown as SwapRow[];
  const defaults = getSetting<Record<MealId, number>>('defaults');
  const cycle = getSetting<Cycle>('cycle');

  const meals = Object.fromEntries(
    MEALS.map((meal): [MealId, DayMeal] => {
      const stored = mealRows.find((m) => m.meal === meal);
      const swaps = swapRows
        .filter((s) => s.meal === meal)
        .map((s): Swap => ({ itemId: s.item_id, label: s.label, kcal: s.kcal, p: s.p, c: s.c, g: s.g }));
      return [meal, {
        meal,
        dishId: stored?.dish_id ?? defaults[meal],
        done: !!stored?.done,
        improvised: stored?.improvised ? (JSON.parse(stored.improvised) as LoggedItem[]) : null,
        swaps,
      }];
    }),
  ) as Record<MealId, DayMeal>;

  const previous = db.prepare('SELECT weight FROM days WHERE date < ? AND weight IS NOT NULL ORDER BY date DESC LIMIT 1').get(date) as { weight: number } | undefined;
  const baseline = db.prepare('SELECT weight FROM days WHERE date = ?').get(cycle.start) as { weight: number | null } | undefined;

  return {
    date,
    weight: row?.weight ?? null,
    musc: !!row?.musc,
    workoutLabel: row?.workout_label ?? null,
    activity: row?.activity ?? 'nenhuma',
    meals,
    previousWeight: previous?.weight ?? null,
    baselineWeight: baseline?.weight ?? cycle.startWeight,
  };
}

function saveMeal(date: string, meal: MealId, change: { dishId?: number; done?: boolean; improvised?: LoggedItem[] | null }) {
  const current = db.prepare('SELECT * FROM day_meals WHERE date = ? AND meal = ?').get(date, meal) as MealRow | undefined;
  const dishId = change.dishId ?? current?.dish_id ?? null;
  const done = change.done ?? !!current?.done;
  const improvised = change.improvised === undefined ? (current?.improvised ?? null) : change.improvised && JSON.stringify(change.improvised);
  db.prepare('INSERT OR REPLACE INTO day_meals (date, meal, dish_id, done, improvised) VALUES (?, ?, ?, ?, ?)').run(date, meal, dishId, done ? 1 : 0, improvised);
}

export function dayRoutes(router: Router) {
  router.get('/api/days/:date', ({ params }) => loadDay(requireDate(params.date)));

  router.patch('/api/days/:date', ({ params, body }) => {
    const date = requireDate(params.date);
    ensureDay(date);
    if ('weight' in body) {
      db.prepare('UPDATE days SET weight = ? WHERE date = ?').run(optionalNumber(body.weight, 'peso', 400), date);
    }
    if ('activity' in body) {
      if (!ACTIVITIES.includes(body.activity)) badRequest('Atividade inválida');
      db.prepare('UPDATE days SET activity = ? WHERE date = ?').run(body.activity, date);
    }
    if ('musc' in body) {
      // Switching it on by hand counts as the workout due that day, so the rotation moves on.
      const due = body.musc ? nextDueLabel(date) : null;
      db.prepare('UPDATE days SET musc = ?, workout_id = ?, workout_label = ? WHERE date = ?').run(body.musc ? 1 : 0, due?.id ?? null, due?.label ?? null, date);
    }
    return loadDay(date);
  });

  router.patch('/api/days/:date/meals/:meal', ({ params, body }) => {
    const date = requireDate(params.date);
    const meal = requireMeal(params.meal);
    saveMeal(date, meal, {
      dishId: body.dishId === undefined ? undefined : requireId(String(body.dishId)),
      done: body.done === undefined ? undefined : !!body.done,
      improvised: body.improvised === undefined ? undefined : body.improvised === null ? null : parseItems(body.improvised),
    });
    return loadDay(date);
  });

  router.put('/api/days/:date/meals/:meal/swaps/:itemId', ({ params, body }) => {
    const date = requireDate(params.date);
    db.prepare('INSERT OR REPLACE INTO day_swaps (date, meal, item_id, label, kcal, p, c, g) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      date,
      requireMeal(params.meal),
      requireId(params.itemId),
      requireText(body.label, 'alimento', 200),
      requireNumber(body.kcal, 'calorias'),
      requireNumber(body.p, 'proteína'),
      requireNumber(body.c, 'carboidrato'),
      requireNumber(body.g, 'gordura'),
    );
    return loadDay(date);
  });

  router.delete('/api/days/:date/meals/:meal/swaps/:itemId', ({ params }) => {
    const date = requireDate(params.date);
    db.prepare('DELETE FROM day_swaps WHERE date = ? AND meal = ? AND item_id = ?').run(date, requireMeal(params.meal), requireId(params.itemId));
    return loadDay(date);
  });
}
