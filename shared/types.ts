// Contract between the server and the client. Type-only: erased at runtime on both sides.

export type MealId = 'cafe' | 'almoco' | 'lanche' | 'janta';
export type ActivityId = 'nenhuma' | 'basquete' | 'futebol' | 'outra';
export type FoodUnit = 'g' | 'ml';
export type FoodSource = 'TACO' | 'Open Food Facts' | 'Rótulo';

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  g: number;
}

/** Values are per 100 g or 100 ml. `id` is null for Open Food Facts hits not saved yet. */
export interface Food extends Macros {
  id: number | null;
  name: string;
  brand: string | null;
  source: FoodSource;
  sourceRef: string | null;
  unit: FoodUnit;
}

/** One food eaten, with its per-100 values frozen so later edits never rewrite history. */
export interface LoggedItem {
  name: string;
  source: FoodSource;
  unit: FoodUnit;
  qty: number;
  per100: Macros;
}

export interface DishItem extends Macros {
  id: number;
  label: string;
  /** Key of this food in the swap table; null when the plan has no equivalents for it. */
  swapKey: string | null;
}

export type DishKind = 'fixed' | 'option' | 'extra';

export interface Dish extends Macros {
  id: number;
  code: string;
  kind: DishKind;
  short: string;
  name: string;
  summary: string;
  custom: boolean;
  archived: boolean;
  items: DishItem[];
}

export interface Equivalent {
  key: string;
  name: string;
  /** Fixed caption; when null the UI shows the calories being matched. */
  note: string | null;
  unit: 'g' | 'un' | 'fatia';
  /** Used to build the swap label, e.g. "batata crua" or "pão francês". */
  singular: string;
  plural: string;
  /** Macros per single unit (1 g, 1 un, 1 fatia). */
  per: Macros;
}

export interface Cycle {
  start: string;
  days: number;
  startWeight: number;
  targetWeight: number;
  weeklyRate: number;
  rateMin: number;
  rateMax: number;
  weeklyWorkouts: number;
}

export interface Goals {
  kcal: number;
  kcalGame: number;
  carbs: number;
  carbsGame: number;
  proteinMin: number;
  proteinMax: number;
  fatMin: number;
  fatMax: number;
}

export interface Plan {
  cycle: Cycle;
  goals: Goals;
  dishes: Dish[];
  equivalents: Equivalent[];
  defaults: Record<MealId, number>;
  extraDishId: number;
}

export interface Swap extends Macros {
  itemId: number;
  label: string;
}

export interface DayMeal {
  meal: MealId;
  dishId: number;
  done: boolean;
  improvised: LoggedItem[] | null;
  swaps: Swap[];
}

export interface Day {
  date: string;
  weight: number | null;
  musc: boolean;
  workoutLabel: string | null;
  activity: ActivityId;
  meals: Record<MealId, DayMeal>;
  previousWeight: number | null;
  baselineWeight: number;
}

export interface ProgressDay {
  date: string;
  weight: number | null;
  musc: boolean;
  activity: ActivityId;
}

export interface Measure {
  date: string;
  belly: number | null;
  navel: number | null;
  arm: number | null;
}

export interface ProgressData {
  days: ProgressDay[];
  measures: Measure[];
}

export interface WorkoutSet {
  id: number;
  load: string;
  reps: string;
  /** Last finished session's value for this set, e.g. "70 × 7". */
  previous: string | null;
}

export interface Exercise {
  id: number;
  name: string;
  muscle: string;
  target: string;
  rest: number;
  sets: WorkoutSet[];
}

export interface Workout {
  id: number;
  letter: string;
  name: string;
  lastDate: string | null;
  exercises: Exercise[];
}

export interface ActiveSession {
  id: number;
  workoutId: number;
  doneSetIds: number[];
  restEnd: number | null;
  restTotal: number | null;
}

export interface LibraryExercise {
  name: string;
  muscle: string;
}

export interface TrainingState {
  workouts: Workout[];
  active: ActiveSession | null;
  /** Whose turn it is in the rotation: the running or finished one, else the next due. */
  currentId: number | null;
  nextId: number | null;
  doneToday: boolean;
  library: LibraryExercise[];
}

export interface ParsedRow {
  text: string;
  qty: number;
  unit: FoodUnit;
  food: Food | null;
}

export interface ExternalSearch {
  foods: Food[];
  limited: boolean;
  failed: boolean;
}
