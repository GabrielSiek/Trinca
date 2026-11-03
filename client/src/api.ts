import type {
  ActivityId, Day, Dish, ExternalSearch, Food, LoggedItem, Macros, MealId, ParsedRow, Plan, ProgressData, TrainingState,
} from '../../shared/types.ts';

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error ?? `Erro ${res.status} no servidor`);
  }
  return res.json();
}

const train = (path: string, today: string) => `${path}?today=${today}`;

export const api = {
  plan: () => request<Plan>('GET', '/plan'),
  createDish: (name: string, items: LoggedItem[]) => request<Dish>('POST', '/dishes', { name, items }),
  archiveDish: (id: number) => request<Plan>('DELETE', `/dishes/${id}`),

  day: (date: string) => request<Day>('GET', `/days/${date}`),
  patchDay: (date: string, change: { weight?: number | null; musc?: boolean; activity?: ActivityId }) => request<Day>('PATCH', `/days/${date}`, change),
  patchMeal: (date: string, meal: MealId, change: { dishId?: number; done?: boolean; improvised?: LoggedItem[] | null }) =>
    request<Day>('PATCH', `/days/${date}/meals/${meal}`, change),
  saveSwap: (date: string, meal: MealId, itemId: number, swap: Macros & { label: string }) => request<Day>('PUT', `/days/${date}/meals/${meal}/swaps/${itemId}`, swap),
  revertSwap: (date: string, meal: MealId, itemId: number) => request<Day>('DELETE', `/days/${date}/meals/${meal}/swaps/${itemId}`),

  searchFoods: (q: string, signal?: AbortSignal) => request<Food[]>('GET', `/foods/search?q=${encodeURIComponent(q)}`, undefined, signal),
  searchExternal: (q: string, signal?: AbortSignal) => request<ExternalSearch>('GET', `/foods/external?q=${encodeURIComponent(q)}`, undefined, signal),
  parseFoods: (text: string) => request<ParsedRow[]>('POST', '/foods/parse', { text }),
  saveFood: (food: Omit<Food, 'id' | 'sourceRef'> & { sourceRef?: string | null }) => request<Food>('POST', '/foods', food),
  markFoodUsed: (id: number) => request<unknown>('POST', `/foods/${id}/used`),

  progress: () => request<ProgressData>('GET', '/progress'),
  saveMeasures: (date: string, m: { belly: number | null; navel: number | null; arm: number | null }) => request<ProgressData>('PUT', `/measures/${date}`, m),

  training: (today: string) => request<TrainingState>('GET', train('/training', today)),
  createWorkout: (today: string) => request<TrainingState>('POST', train('/workouts', today)),
  renameWorkout: (today: string, id: number, name: string) => request<TrainingState>('PATCH', train(`/workouts/${id}`, today), { name }),
  deleteWorkout: (today: string, id: number) => request<TrainingState>('DELETE', train(`/workouts/${id}`, today)),
  addExercise: (today: string, workoutId: number, name: string, muscle: string) => request<TrainingState>('POST', train(`/workouts/${workoutId}/exercises`, today), { name, muscle }),
  patchExercise: (today: string, id: number, change: { name: string; muscle: string; target: string; rest: number }) => request<TrainingState>('PATCH', train(`/exercises/${id}`, today), change),
  deleteExercise: (today: string, id: number) => request<TrainingState>('DELETE', train(`/exercises/${id}`, today)),
  addSet: (today: string, exerciseId: number) => request<TrainingState>('POST', train(`/exercises/${exerciseId}/sets`, today)),
  patchSet: (today: string, id: number, load: string, reps: string) => request<TrainingState>('PATCH', train(`/sets/${id}`, today), { load, reps }),
  deleteSet: (today: string, id: number) => request<TrainingState>('DELETE', train(`/sets/${id}`, today)),
  startSession: (today: string, workoutId: number) => request<TrainingState>('POST', train('/sessions', today), { workoutId }),
  patchSession: (today: string, id: number, change: { set?: { id: number; done: boolean }; rest?: { end: number; total: number } | null }) =>
    request<TrainingState>('PATCH', train(`/sessions/${id}`, today), change),
  finishSession: (today: string, id: number) => request<TrainingState>('POST', train(`/sessions/${id}/finish`, today)),
  discardSession: (today: string, id: number) => request<TrainingState>('DELETE', train(`/sessions/${id}`, today)),
};
