import type { ActivityId, Day, Dish, DishItem, Equivalent, Food, Goals, LoggedItem, Macros, MealId, Plan } from '../../../shared/types.ts';
import { dec, fmt, pct } from './format.ts';

export const MEAL_ORDER: MealId[] = ['cafe', 'almoco', 'lanche', 'janta'];

const MEAL_NAMES: Record<MealId, string> = { cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche / pré-treino', janta: 'Janta' };
const MEAL_SHORT: Record<MealId, string> = { cafe: 'Café', almoco: 'Almoço', lanche: 'Lanche', janta: 'Janta' };
const MEAL_SAVE: Record<MealId, string> = { cafe: 'Salvar no café', almoco: 'Salvar no almoço', lanche: 'Salvar no lanche', janta: 'Salvar na janta' };

export const mealShort = (id: MealId) => MEAL_SHORT[id];
export const mealSaveLabel = (id: MealId) => MEAL_SAVE[id];

export const ZERO: Macros = { kcal: 0, p: 0, c: 0, g: 0 };

export const addMacros = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, g: a.g + b.g });
export const subMacros = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal - b.kcal, p: a.p - b.p, c: a.c - b.c, g: a.g - b.g });
export const scaleMacros = (m: Macros, f: number): Macros => ({ kcal: m.kcal * f, p: m.p * f, c: m.c * f, g: m.g * f });
export const macrosOf = ({ kcal, p, c, g }: Macros): Macros => ({ kcal, p, c, g });

export const loggedMacros = (item: LoggedItem) => scaleMacros(item.per100, item.qty / 100);
export const sumLogged = (items: LoggedItem[]) => items.map(loggedMacros).reduce(addMacros, ZERO);

export const isGameDay = (activity: ActivityId) => activity !== 'nenhuma';

export function dayGoals(activity: ActivityId, goals: Goals) {
  const game = isGameDay(activity);
  return { kcal: game ? goals.kcalGame : goals.kcal, carbs: game ? goals.carbsGame : goals.carbs };
}

export interface ItemView {
  key: string;
  label: string;
  /** Null hides the calories on the row, as plated dishes do in the plan. */
  kcal: number | null;
  extra: boolean;
  swapped: boolean;
  dishItem: DishItem | null;
}

export interface MealView {
  id: MealId;
  name: string;
  short: string;
  sub: string;
  summary: string;
  optionName: string;
  optionNameShort: string;
  macros: Macros;
  done: boolean;
  isOption: boolean;
  improvised: boolean;
  dish: Dish;
  items: ItemView[];
}

export const logLabel = (item: Pick<LoggedItem, 'qty' | 'unit' | 'name'>) => `${item.qty} ${item.unit} de ${item.name.toLowerCase()}`;

export function buildMeals(day: Day, plan: Plan): MealView[] {
  const dishById = (id: number) => plan.dishes.find((d) => d.id === id);
  return MEAL_ORDER.map((id) => {
    const state = day.meals[id];
    const dish = dishById(state.dishId) ?? dishById(plan.defaults[id])!;
    const isOption = dish.kind === 'option';
    const base = { id, name: MEAL_NAMES[id], short: MEAL_SHORT[id], done: state.done, isOption, dish };

    if (state.improvised) {
      const items = state.improvised;
      return {
        ...base,
        improvised: true,
        sub: 'Improvisada',
        summary: `Improvisada · ${items.length} ${items.length === 1 ? 'alimento' : 'alimentos'}`,
        optionName: 'Refeição improvisada',
        optionNameShort: 'Refeição improvisada',
        macros: sumLogged(items),
        items: items.map((item, i): ItemView => ({
          key: `log-${i}`, label: logLabel(item), kcal: loggedMacros(item).kcal, extra: false, swapped: false, dishItem: null,
        })),
      };
    }

    const game = id === 'lanche' && isGameDay(day.activity);
    const extra = game ? dishById(plan.extraDishId) : undefined;
    const rows = [...dish.items.map((item) => ({ item, extra: false })), ...(extra?.items ?? []).map((item) => ({ item, extra: true }))];

    // Dish totals are the plan's own numbers; each swap moves them by the difference.
    let macros = addMacros(macrosOf(dish), extra ? macrosOf(extra) : ZERO);
    const items = rows.map(({ item, extra: isExtra }): ItemView => {
      const swap = state.swaps.find((s) => s.itemId === item.id);
      if (swap) macros = addMacros(macros, subMacros(macrosOf(swap), macrosOf(item)));
      return {
        key: `item-${item.id}`,
        label: swap?.label ?? item.label,
        kcal: swap ? swap.kcal : isOption ? null : item.kcal,
        extra: isExtra,
        swapped: !!swap,
        dishItem: item,
      };
    });

    return {
      ...base,
      improvised: false,
      sub: isOption ? `Opção ${dish.code}` : game ? 'Fixo + extra de jogo' : 'Fixo',
      summary: isOption ? `Opção ${dish.code} · ${dish.summary}` : game ? 'Fixo + extra de jogo' : dish.summary,
      optionName: dish.name,
      optionNameShort: dish.summary,
      macros,
      items,
    };
  });
}

export function dayTotals(meals: MealView[]) {
  return {
    eaten: meals.filter((m) => m.done).map((m) => m.macros).reduce(addMacros, ZERO),
    planned: meals.map((m) => m.macros).reduce(addMacros, ZERO),
  };
}

export interface MacroView {
  name: string;
  value: string;
  goal: string;
  status: string;
  tone: 'muted' | 'ok' | 'over';
  fillW: string;
  planW: string;
  bandL: string;
  bandW: string;
}

/** Ranged macros have a band; `approx` ones (carbs) a single mark with ±5% counted as on target. */
export function macroView(name: string, eaten: number, planned: number, min: number, max: number, approx: boolean): MacroView {
  const scale = Math.max(max * 1.25, planned * 1.05, eaten * 1.05);
  const low = approx ? max * 0.95 : min;
  const high = approx ? max * 1.05 : max;
  let status: string;
  let tone: MacroView['tone'];
  if (eaten < low) {
    status = `faltam ${fmt((approx ? max : min) - eaten)} g`;
    tone = 'muted';
  } else if (eaten <= high) {
    status = 'na meta';
    tone = 'ok';
  } else {
    status = `+${fmt(eaten - max)} g acima`;
    tone = 'over';
  }
  return {
    name,
    value: fmt(eaten),
    goal: approx ? `~${fmt(max)} g` : `${min}–${max} g`,
    status,
    tone,
    fillW: pct(eaten / scale),
    planW: pct(planned / scale),
    bandL: pct((approx ? max : min) / scale),
    bandW: approx ? '2px' : pct((max - min) / scale),
  };
}

export interface Segment {
  id: MealId;
  label: string;
  width: string;
  done: boolean;
  kcal: number;
}

/** Eaten meals first, then what is still planned, against a scale that fits the goal marker. */
export function calorieBar(meals: MealView[], goal: number, planned: number, eaten: number) {
  const scale = Math.max(goal, planned, eaten) * 1.08;
  const ordered = [...meals.filter((m) => m.done), ...meals.filter((m) => !m.done)];
  return {
    goalAt: pct(goal / scale),
    segments: ordered.map((m): Segment => ({
      id: m.id,
      label: `${m.short} ${fmt(m.macros.kcal)}`,
      width: pct(m.macros.kcal / scale),
      done: m.done,
      kcal: m.macros.kcal,
    })),
  };
}

export interface SwapChoice {
  qtyText: string;
  label: string;
  macros: Macros;
}

/** What the plan's swap table gives for the calories of an item. */
export function equivalentChoice(eq: Equivalent, kcal: number): SwapChoice {
  const raw = kcal / eq.per.kcal;
  if (eq.unit === 'g') {
    const qty = Math.round(raw);
    return { qtyText: `${qty} g`, label: `${qty} g de ${eq.singular}`, macros: scaleMacros(eq.per, qty) };
  }
  const qty = Math.max(0.5, Math.round(raw * 2) / 2);
  const whole = Number.isInteger(qty);
  if (eq.unit === 'un') {
    return { qtyText: `${dec(qty, whole ? 0 : 1)} un.`, label: `${dec(qty, whole ? 0 : 1)} ${qty === 1 ? eq.singular : eq.plural}`, macros: scaleMacros(eq.per, qty) };
  }
  const slices = whole ? `${qty} ${qty === 1 ? 'fatia' : 'fatias'}` : `${Math.floor(qty)}–${Math.ceil(qty)} fatias`;
  return { qtyText: slices, label: `${slices} de ${eq.singular}`, macros: scaleMacros(eq.per, qty) };
}

/** How much of a food matches an item's calories. Calorie-free foods fall back to 100. */
export function foodChoice(food: Food, kcal: number): SwapChoice {
  const qty = food.kcal > 0 ? Math.max(1, Math.round((kcal / food.kcal) * 100)) : 100;
  return {
    qtyText: `${qty} ${food.unit}`,
    label: logLabel({ qty, unit: food.unit, name: food.name }),
    macros: scaleMacros(macrosOf(food), qty / 100),
  };
}
