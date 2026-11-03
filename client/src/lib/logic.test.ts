import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ActiveSession, Cycle, Day, DayMeal, Dish, Equivalent, Food, MealId, Plan, ProgressData, Workout } from '../../../shared/types.ts';
import { addDays, dateLong, ddmm, monthGrid, weekday } from './dates.ts';
import { clock, dec, parseDecimal, signed } from './format.ts';
import { buildMeals, calorieBar, dayGoals, dayTotals, equivalentChoice, foodChoice, macroView } from './nutrition.ts';
import { buildWeeks, cycleInfo, rollingMean, weekAdjustment, workoutSummary } from './progress.ts';
import { doneCount, pendingSet, seriesCount } from './training.ts';

const CYCLE: Cycle = { start: '2026-10-31', days: 50, startWeight: 84.4, targetWeight: 81.4, weeklyRate: 0.4, rateMin: 0.25, rateMax: 0.6, weeklyWorkouts: 5 };

const dish = (id: number, code: string, kind: Dish['kind'], kcal: number, p: number, c: number, g: number, items: Dish['items'] = []): Dish => ({
  id, code, kind, short: code, name: `Prato ${code}`, summary: code, custom: false, archived: false, kcal, p, c, g, items,
});

const RICE = { id: 100, label: '180 g de arroz cozido', swapKey: 'arroz', kcal: 234, p: 4.5, c: 50, g: 0.4 };

const PLAN: Plan = {
  cycle: CYCLE,
  goals: { kcal: 2400, kcalGame: 2700, carbs: 240, carbsGame: 300, proteinMin: 170, proteinMax: 190, fatMin: 60, fatMax: 70 },
  dishes: [
    dish(1, 'cafe', 'fixed', 570, 35, 74, 14),
    dish(2, 'lanche', 'fixed', 345, 23, 45, 7.5),
    dish(3, 'jogo', 'extra', 275, 7.5, 56, 3),
    dish(4, '1', 'option', 725, 58, 68, 22, [RICE]),
    dish(5, '5', 'option', 735, 55, 60, 28),
  ],
  equivalents: [],
  defaults: { cafe: 1, almoco: 4, lanche: 2, janta: 5 },
  extraDishId: 3,
};

const meal = (id: MealId, dishId: number, done: boolean, extra: Partial<DayMeal> = {}): DayMeal => ({ meal: id, dishId, done, improvised: null, swaps: [], ...extra });

const DAY: Day = {
  date: '2026-11-14', weight: 83.3, musc: true, workoutLabel: null, activity: 'nenhuma', previousWeight: 83.1, baselineWeight: 84.4,
  meals: { cafe: meal('cafe', 1, true), almoco: meal('almoco', 4, true), lanche: meal('lanche', 2, true), janta: meal('janta', 5, false) },
};

test('dates and formats match the design', () => {
  assert.equal(weekday('2026-11-14'), 'Sábado');
  assert.equal(dateLong('2026-11-14'), '14 de novembro');
  assert.equal(ddmm(addDays(CYCLE.start, 49)), '19/12');
  assert.equal(monthGrid(2026, 10)[0]?.day, 1);
  assert.equal(monthGrid(2026, 9)[4]?.day, 1);
  assert.equal(monthGrid(2026, 10).length % 7, 0);
  assert.equal(signed(83.3 - 84.4), '−1,1');
  assert.equal(signed(0), '±0,0');
  assert.equal(parseDecimal('83,3'), 83.3);
  assert.equal(parseDecimal('abc'), null);
  assert.equal(clock(104), '1:44');
  assert.equal(dec(83.39), '83,4');
});

test('meals add up to the numbers shown on the Hoje screen', () => {
  const meals = buildMeals(DAY, PLAN);
  const { eaten, planned } = dayTotals(meals);
  assert.equal(eaten.kcal, 1640);
  assert.equal(planned.kcal, 2375);
  assert.equal(eaten.p, 116);
  assert.equal(meals[2].sub, 'Fixo');
  assert.equal(meals[1].sub, 'Opção 1');
});

test('a game day raises the goals and adds the snack extra', () => {
  const meals = buildMeals({ ...DAY, activity: 'basquete' }, PLAN);
  assert.deepEqual(dayGoals('basquete', PLAN.goals), { kcal: 2700, carbs: 300 });
  assert.deepEqual(dayGoals('nenhuma', PLAN.goals), { kcal: 2400, carbs: 240 });
  assert.equal(meals[2].macros.kcal, 620);
  assert.equal(meals[2].macros.p, 30.5);
  assert.equal(meals[2].macros.c, 101);
  assert.equal(meals[2].macros.g, 10.5);
  assert.equal(meals[2].sub, 'Fixo + extra de jogo');
});

test('a swap moves the meal by the difference, not to the sum of its items', () => {
  const day = { ...DAY, meals: { ...DAY.meals, almoco: meal('almoco', 4, true, { swaps: [{ itemId: 100, label: '360 g de batata crua', kcal: 234, p: 6.5, c: 53, g: 0 }] }) } };
  const lunch = buildMeals(day, PLAN)[1];
  assert.equal(lunch.macros.kcal, 725);
  assert.equal(lunch.macros.p, 60);
  assert.equal(lunch.macros.c, 71);
  assert.equal(lunch.items[0].label, '360 g de batata crua');
  assert.equal(lunch.items[0].swapped, true);
});

test('an improvised meal replaces the planned one', () => {
  const improvised = [{ name: 'Arroz', source: 'TACO' as const, unit: 'g' as const, qty: 200, per100: { kcal: 128, p: 2.5, c: 28, g: 0.2 } }];
  const day = { ...DAY, meals: { ...DAY.meals, almoco: meal('almoco', 4, true, { improvised }) } };
  const lunch = buildMeals(day, PLAN)[1];
  assert.equal(lunch.macros.kcal, 256);
  assert.equal(lunch.sub, 'Improvisada');
  assert.equal(lunch.items[0].label, '200 g de arroz');
});

test('the calorie bar lists eaten meals first', () => {
  const meals = buildMeals({ ...DAY, meals: { ...DAY.meals, almoco: meal('almoco', 4, false), janta: meal('janta', 5, true) } }, PLAN);
  const { eaten, planned } = dayTotals(meals);
  const bar = calorieBar(meals, 2400, planned.kcal, eaten.kcal);
  assert.deepEqual(bar.segments.map((s) => s.id), ['cafe', 'lanche', 'janta', 'almoco']);
  assert.equal(bar.goalAt, '92.59%');
});

test('macro status follows the design rules', () => {
  assert.equal(macroView('Proteína', 116, 171, 170, 190, false).status, 'faltam 54 g');
  assert.equal(macroView('Proteína', 180, 180, 170, 190, false).status, 'na meta');
  assert.equal(macroView('Gordura', 80, 80, 60, 70, false).status, '+10 g acima');
  assert.equal(macroView('Carboidrato', 235, 235, 240, 240, true).status, 'na meta');
  assert.equal(macroView('Carboidrato', 235, 235, 240, 240, true).goal, '~240 g');
});

const eq = (key: string, unit: Equivalent['unit'], kcal: number, singular: string, plural = singular): Equivalent => ({
  key, name: key, note: null, unit, singular, plural, per: { kcal, p: 0, c: 0, g: 0 },
});

test('the swap table reproduces the design for 180 g of rice', () => {
  assert.equal(equivalentChoice(eq('batata', 'g', 0.65, 'batata crua'), 234).label, '360 g de batata crua');
  assert.equal(equivalentChoice(eq('mandioca', 'g', 1.3, 'mandioca'), 234).label, '180 g de mandioca');
  assert.equal(equivalentChoice(eq('massa', 'g', 3.71, 'massa'), 234).label, '63 g de massa');
  assert.equal(equivalentChoice(eq('pao', 'un', 117, 'pão francês', 'pães franceses'), 234).label, '2 pães franceses');
  const slices = equivalentChoice(eq('integral', 'fatia', 67, 'pão integral'), 234);
  assert.equal(slices.qtyText, '3–4 fatias');
  assert.equal(slices.label, '3–4 fatias de pão integral');
});

test('searched foods are sized to match the calories', () => {
  const food = (kcal: number): Food => ({ id: 1, name: 'Cuscuz', brand: null, source: 'TACO', sourceRef: '1', unit: 'g', kcal, p: 2, c: 25, g: 1 });
  assert.equal(foodChoice(food(113), 234).label, '207 g de cuscuz');
  assert.equal(foodChoice(food(360), 234).qtyText, '65 g');
  assert.equal(foodChoice(food(0), 234).qtyText, '100 g');
});

const WEIGHTS = [84.4, 84.1, 84.3, 83.8, 83.9, 83.6, 83.7, 83.5, 83.8, 83.4, 83.5, 83.2, 83.4, 83.1, 83.3];
const MUSC = [2, 3, 5, 6, 7, 9, 10, 12, 13, 14];
const GAMES: Record<number, 'basquete' | 'futebol'> = { 3: 'basquete', 7: 'futebol', 8: 'futebol', 10: 'basquete' };
const DATA: ProgressData = {
  days: WEIGHTS.map((weight, i) => ({ date: addDays(CYCLE.start, i), weight, musc: MUSC.includes(i), activity: GAMES[i] ?? 'nenhuma' })),
  measures: [{ date: '2026-10-31', belly: 85, navel: 92, arm: 34.5 }, { date: '2026-11-07', belly: 84, navel: 91.5, arm: 34.5 }],
};
const TODAY = '2026-11-14';

test('progress reproduces the design numbers', () => {
  const info = cycleInfo(CYCLE, TODAY);
  assert.equal(info.dayNumber, 15);
  assert.equal(info.daysLeft, 35);
  assert.equal(info.end, '2026-12-19');
  assert.equal(dec(rollingMean(DATA.days, TODAY)!), '83,4');

  const weeks = buildWeeks(CYCLE, DATA, TODAY);
  assert.equal(weeks.length, 8);
  assert.deepEqual(weeks.map((w) => ddmm(w.date)), ['31/10', '07/11', '14/11', '21/11', '28/11', '05/12', '12/12', '19/12']);
  assert.equal(dec(weeks[1].mean!), '83,8');
  assert.equal(signed(weeks[1].change!, 2), '−0,56');
  assert.equal(dec(weeks[2].mean!), '83,4');
  // The mockup prints −0,45 by hand; its own weights average out to −0,457.
  assert.equal(signed(weeks[2].change!, 2), '−0,46');
  assert.deepEqual(weeks.map((w) => w.advice), ['Início', 'Mantenha', 'Mantenha', '', '', '', '', 'Fim do cutting']);
  assert.equal(weeks[2].current, true);
  assert.equal(weeks[1].measure?.navel, 91.5);
  assert.equal(weeks[2].measure, null);
  assert.equal(weeks[3].mean, null);
  assert.equal(weeks[3].musc, null);

  const adjustment = weekAdjustment(CYCLE, weeks, TODAY);
  assert.equal(adjustment.title, 'Mantenha');
  assert.equal(adjustment.text, 'A média caiu 0,46 kg. O alvo é de 0,25 a 0,6 kg por semana.');
  assert.equal(adjustment.nextReview, '2026-11-21');

  const summary = workoutSummary(CYCLE, DATA, TODAY);
  assert.equal(summary.musc, 10);
  assert.equal(summary.perWeek, 5);
  assert.equal(summary.activity, 4);
  assert.equal(summary.breakdown, '2 basquete · 2 futebol');
  assert.equal(summary.both, 3);
});

test('the first day has no review yet and handles empty data', () => {
  const data: ProgressData = { days: [{ date: CYCLE.start, weight: 84.4, musc: false, activity: 'nenhuma' }], measures: [] };
  const weeks = buildWeeks(CYCLE, data, CYCLE.start);
  const adjustment = weekAdjustment(CYCLE, weeks, CYCLE.start);
  assert.equal(adjustment.title, 'Início');
  assert.equal(adjustment.nextReview, '2026-11-07');
  assert.equal(weeks[0].current, true);
  assert.equal(weeks[1].mean, null);
  assert.equal(rollingMean([], CYCLE.start), null);
  assert.equal(workoutSummary(CYCLE, data, CYCLE.start).perWeek, 0);
});

test('off-target weeks ask for a change', () => {
  const slow = { ...DATA, days: DATA.days.map((d, i) => ({ ...d, weight: i < 8 ? 84 : 83.9 })) };
  assert.equal(weekAdjustment(CYCLE, buildWeeks(CYCLE, slow, TODAY), TODAY).title, 'Reduza');
  const fast = { ...DATA, days: DATA.days.map((d, i) => ({ ...d, weight: i < 8 ? 84 : 83 })) };
  assert.equal(weekAdjustment(CYCLE, buildWeeks(CYCLE, fast, TODAY), TODAY).title, 'Aumente');
  const gain = { ...DATA, days: DATA.days.map((d, i) => ({ ...d, weight: i < 8 ? 83 : 83.5 })) };
  const adjustment = weekAdjustment(CYCLE, buildWeeks(CYCLE, gain, TODAY), TODAY);
  assert.equal(adjustment.title, 'Reduza');
  assert.match(adjustment.text, /A média subiu 0,50 kg/);
});

test('the next set is the first unchecked one', () => {
  const workout: Workout = {
    id: 1, letter: 'A', name: 'Peito', lastDate: null,
    exercises: [
      { id: 1, name: 'Supino', muscle: 'Peito', target: '6–8', rest: 150, sets: [{ id: 1, load: '70', reps: '8', previous: null }, { id: 2, load: '70', reps: '7', previous: null }] },
      { id: 2, name: 'Crucifixo', muscle: 'Peito', target: '10', rest: 90, sets: [{ id: 3, load: '15', reps: '12', previous: null }] },
    ],
  };
  const session = (doneSetIds: number[]): ActiveSession => ({ id: 1, workoutId: 1, doneSetIds, restEnd: null, restTotal: null });
  assert.equal(seriesCount(workout), 3);
  assert.equal(pendingSet(workout, session([1]))?.set.id, 2);
  assert.equal(pendingSet(workout, session([1, 2]))?.exercise.name, 'Crucifixo');
  assert.equal(pendingSet(workout, session([1, 2, 3])), null);
  assert.equal(doneCount(workout, session([2, 3])), 2);
});
