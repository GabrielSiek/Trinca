import type { ActiveSession, Exercise, Workout, WorkoutSet } from '../../../shared/types.ts';

export const seriesCount = (w: Workout) => w.exercises.reduce((total, e) => total + e.sets.length, 0);

export function doneCount(w: Workout, session: ActiveSession | null): number {
  if (!session) return 0;
  return w.exercises.reduce((total, e) => total + e.sets.filter((s) => session.doneSetIds.includes(s.id)).length, 0);
}

export interface PendingSet {
  exercise: Exercise;
  set: WorkoutSet;
  index: number;
}

/** The next set to do: the first unchecked one, in order. */
export function pendingSet(w: Workout, session: ActiveSession): PendingSet | null {
  for (const exercise of w.exercises) {
    const index = exercise.sets.findIndex((s) => !session.doneSetIds.includes(s.id));
    if (index >= 0) return { exercise, set: exercise.sets[index], index };
  }
  return null;
}
