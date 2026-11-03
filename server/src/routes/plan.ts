import type { Cycle, Dish, DishItem, DishKind, Equivalent, FoodSource, Goals, LoggedItem, MealId, Plan } from '../../../shared/types.ts';
import { db, getSetting, transaction } from '../db.ts';
import { badRequest, HttpError, requireId, requireNumber, requireText, type Router } from '../http.ts';

interface DishRow {
  id: number;
  code: string;
  kind: DishKind;
  short: string;
  name: string;
  summary: string;
  kcal: number;
  p: number;
  c: number;
  g: number;
  custom: number;
  archived: number;
}

interface ItemRow {
  id: number;
  dish_id: number;
  label: string;
  kcal: number;
  p: number;
  c: number;
  g: number;
  swap_key: string | null;
}

export function loadDishes(): Dish[] {
  const rows = db.prepare('SELECT * FROM dishes ORDER BY position, id').all() as unknown as DishRow[];
  const items = db.prepare('SELECT * FROM dish_items ORDER BY position').all() as unknown as ItemRow[];
  return rows.map(({ custom, archived, ...dish }) => ({
    ...dish,
    custom: !!custom,
    archived: !!archived,
    items: items
      .filter((item) => item.dish_id === dish.id)
      .map((item): DishItem => ({ id: item.id, label: item.label, swapKey: item.swap_key, kcal: item.kcal, p: item.p, c: item.c, g: item.g })),
  }));
}

export function loadPlan(): Plan {
  return {
    cycle: getSetting<Cycle>('cycle'),
    goals: getSetting<Goals>('goals'),
    equivalents: getSetting<Equivalent[]>('equivalents'),
    defaults: getSetting<Record<MealId, number>>('defaults'),
    extraDishId: getSetting<number>('extraDishId'),
    dishes: loadDishes(),
  };
}

const SOURCES: FoodSource[] = ['TACO', 'Open Food Facts', 'Rótulo'];

export function parseItems(value: unknown): LoggedItem[] {
  if (!Array.isArray(value) || !value.length || value.length > 40) badRequest('Lista de alimentos inválida');
  return value.map((item) => ({
    name: requireText(item?.name, 'alimento', 160),
    source: SOURCES.includes(item?.source) ? item.source : 'Rótulo',
    unit: item?.unit === 'ml' ? 'ml' : 'g',
    qty: requireNumber(item?.qty, 'quantidade', 0, 20000),
    per100: {
      kcal: requireNumber(item?.per100?.kcal, 'calorias', 0, 950),
      p: requireNumber(item?.per100?.p, 'proteína', 0, 100),
      c: requireNumber(item?.per100?.c, 'carboidrato', 0, 100),
      g: requireNumber(item?.per100?.g, 'gordura', 0, 100),
    },
  }));
}

const scaled = (item: LoggedItem) => ({
  kcal: (item.per100.kcal * item.qty) / 100,
  p: (item.per100.p * item.qty) / 100,
  c: (item.per100.c * item.qty) / 100,
  g: (item.per100.g * item.qty) / 100,
});

export function planRoutes(router: Router) {
  router.get('/api/plan', () => loadPlan());

  router.post('/api/dishes', ({ body }) => {
    const name = requireText(body.name, 'nome do prato', 80);
    const items = parseItems(body.items);
    const totals = items.map(scaled).reduce(
      (sum, m) => ({ kcal: sum.kcal + m.kcal, p: sum.p + m.p, c: sum.c + m.c, g: sum.g + m.g }),
      { kcal: 0, p: 0, c: 0, g: 0 },
    );
    return transaction(() => {
      const options = db.prepare(`SELECT code, position FROM dishes WHERE kind = 'option'`).all() as { code: string; position: number }[];
      const code = String(Math.max(0, ...options.map((o) => parseInt(o.code, 10) || 0)) + 1);
      const position = Math.max(0, ...options.map((o) => o.position)) + 1;
      const dishId = db
        .prepare(`INSERT INTO dishes (code, kind, short, name, summary, kcal, p, c, g, position, custom) VALUES (?, 'option', ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
        .run(code, name, name, name, Math.round(totals.kcal), Math.round(totals.p), Math.round(totals.c), Math.round(totals.g), position).lastInsertRowid;
      const insertItem = db.prepare('INSERT INTO dish_items (dish_id, position, label, kcal, p, c, g) VALUES (?, ?, ?, ?, ?, ?, ?)');
      items.forEach((item, i) => {
        const m = scaled(item);
        insertItem.run(dishId, i, `${item.qty} ${item.unit} de ${item.name.toLowerCase()}`, m.kcal, m.p, m.c, m.g);
      });
      return loadDishes().find((dish) => dish.id === Number(dishId));
    });
  });

  // Archived, never deleted: past days still point at the dish.
  router.delete('/api/dishes/:id', ({ params }) => {
    const { changes } = db.prepare('UPDATE dishes SET archived = 1 WHERE id = ? AND custom = 1').run(requireId(params.id));
    if (!changes) throw new HttpError(404, 'Só pratos criados por você podem ser removidos');
    return loadPlan();
  });
}
