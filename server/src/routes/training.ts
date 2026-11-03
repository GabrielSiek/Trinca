import type { ActiveSession, Exercise, LibraryExercise, TrainingState, Workout, WorkoutSet } from '../../../shared/types.ts';
import { db, transaction } from '../db.ts';
import { badRequest, HttpError, requireDate, requireId, requireNumber, requireText, type Ctx, type Router } from '../http.ts';
import { ensureDay } from './days.ts';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface WorkoutRow { id: number; name: string; position: number }
interface ExerciseRow { id: number; workout_id: number; name: string; muscle: string; target: string; rest: number }
interface SetRow { id: number; exercise_id: number; position: number; load: string; reps: string }
interface SessionRow { id: number; workout_id: number; date: string; status: string; rest_end: number | null; rest_total: number | null }

const letterAt = (index: number) => LETTERS.charAt(index) || String(index + 1);

function workoutRows(): WorkoutRow[] {
  return db.prepare('SELECT * FROM workouts ORDER BY position, id').all() as unknown as WorkoutRow[];
}

function previousSets(exerciseId: number): Map<number, string> {
  const rows = db
    .prepare(`
      SELECT ss.set_index, ss.load, ss.reps FROM session_sets ss
      WHERE ss.session_id = (
        SELECT MAX(s.id) FROM sessions s JOIN session_sets x ON x.session_id = s.id
        WHERE s.status = 'done' AND x.exercise_id = ?
      ) AND ss.exercise_id = ?
    `)
    .all(exerciseId, exerciseId) as { set_index: number; load: string; reps: string }[];
  return new Map(rows.map((r) => [r.set_index, `${r.load || '—'} × ${r.reps || '—'}`]));
}

function loadWorkouts(): Workout[] {
  const exercises = db.prepare('SELECT * FROM exercises ORDER BY position, id').all() as unknown as ExerciseRow[];
  const sets = db.prepare('SELECT * FROM sets ORDER BY position, id').all() as unknown as SetRow[];
  // Sessions count too: a day row only remembers the last workout done on that date.
  const lastDates = db
    .prepare(`
      SELECT workout_id, MAX(date) AS date FROM (
        SELECT workout_id, date FROM days WHERE musc = 1 AND workout_id IS NOT NULL
        UNION ALL
        SELECT workout_id, date FROM sessions WHERE status = 'done'
      ) GROUP BY workout_id
    `)
    .all() as { workout_id: number; date: string }[];

  return workoutRows().map((w, index) => ({
    id: w.id,
    letter: letterAt(index),
    name: w.name,
    lastDate: lastDates.find((d) => d.workout_id === w.id)?.date ?? null,
    exercises: exercises
      .filter((e) => e.workout_id === w.id)
      .map((e): Exercise => {
        const previous = previousSets(e.id);
        return {
          id: e.id,
          name: e.name,
          muscle: e.muscle,
          target: e.target,
          rest: e.rest,
          sets: sets
            .filter((s) => s.exercise_id === e.id)
            .map((s, i): WorkoutSet => ({ id: s.id, load: s.load, reps: s.reps, previous: previous.get(i) ?? null })),
        };
      }),
  }));
}

function activeRow(): SessionRow | undefined {
  return db.prepare(`SELECT * FROM sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1`).get() as SessionRow | undefined;
}

function loadActive(): ActiveSession | null {
  const row = activeRow();
  if (!row) return null;
  const done = db.prepare('SELECT set_id FROM session_sets WHERE session_id = ?').all(row.id) as { set_id: number }[];
  return { id: row.id, workoutId: row.workout_id, doneSetIds: done.map((d) => d.set_id), restEnd: row.rest_end, restTotal: row.rest_total };
}

/** The workout due on a date: the one after the last done before it. */
function nextDue(date: string): WorkoutRow | null {
  const list = workoutRows();
  if (!list.length) return null;
  const last = db.prepare('SELECT workout_id FROM days WHERE musc = 1 AND workout_id IS NOT NULL AND date < ? ORDER BY date DESC LIMIT 1').get(date) as { workout_id: number } | undefined;
  const index = list.findIndex((w) => w.id === last?.workout_id);
  return list[(index + 1) % list.length];
}

function labelOf(workoutId: number): string {
  const list = workoutRows();
  const index = list.findIndex((w) => w.id === workoutId);
  return index < 0 ? 'Treino' : `Treino ${letterAt(index)} · ${list[index].name}`;
}

export function nextDueLabel(date: string): { id: number; label: string } | null {
  const due = nextDue(date);
  return due ? { id: due.id, label: labelOf(due.id) } : null;
}

function loadState(today: string): TrainingState {
  const workouts = loadWorkouts();
  const active = loadActive();
  const doneRow = db.prepare('SELECT workout_id FROM days WHERE date = ? AND musc = 1').get(today) as { workout_id: number | null } | undefined;
  const doneToday = !active && !!doneRow?.workout_id;
  const currentId = active?.workoutId ?? (doneToday ? doneRow!.workout_id : nextDue(today)?.id ?? null);
  const index = workouts.findIndex((w) => w.id === currentId);
  const next = workouts.length && index >= 0 ? workouts[(index + 1) % workouts.length] : null;
  const library = db.prepare('SELECT name, muscle FROM exercise_library ORDER BY name').all() as unknown as LibraryExercise[];
  return { workouts, active, currentId, nextId: next?.id ?? null, doneToday, library };
}

const todayOf = ({ query }: Ctx) => requireDate(query.get('today') ?? '');

function mutate(handler: (ctx: Ctx) => void) {
  return (ctx: Ctx) => {
    const today = todayOf(ctx);
    transaction(() => handler(ctx));
    return loadState(today);
  };
}

function requireActive(sessionId: number): SessionRow {
  const row = activeRow();
  if (!row || row.id !== sessionId) throw new HttpError(409, 'Esse treino não está mais em andamento');
  return row;
}

function insertExercise(workoutId: number, name: string, muscle: string) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM exercises WHERE workout_id = ?').get(workoutId) as { n: number };
  const exerciseId = db.prepare(`INSERT INTO exercises (workout_id, position, name, muscle, target, rest) VALUES (?, ?, ?, ?, '8–10', 90)`).run(workoutId, n, name, muscle).lastInsertRowid;
  const insertSet = db.prepare('INSERT INTO sets (exercise_id, position) VALUES (?, ?)');
  for (let i = 0; i < 3; i++) insertSet.run(exerciseId, i);
}

export function trainingRoutes(router: Router) {
  router.get('/api/training', (ctx) => loadState(todayOf(ctx)));

  router.post('/api/workouts', mutate(({ body }) => {
    const { p } = db.prepare('SELECT COALESCE(MAX(position), -1) AS p FROM workouts').get() as { p: number };
    db.prepare('INSERT INTO workouts (name, position) VALUES (?, ?)').run(typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Novo treino', p + 1);
  }));

  router.patch('/api/workouts/:id', mutate(({ params, body }) => {
    db.prepare('UPDATE workouts SET name = ? WHERE id = ?').run(requireText(body.name, 'nome do treino', 60), requireId(params.id));
  }));

  router.delete('/api/workouts/:id', mutate(({ params }) => {
    const id = requireId(params.id);
    if (activeRow()?.workout_id === id) throw new HttpError(409, 'Encerre o treino em andamento antes de excluí-lo');
    db.prepare('DELETE FROM workouts WHERE id = ?').run(id);
  }));

  router.post('/api/workouts/:id/exercises', mutate(({ params, body }) => {
    const name = requireText(body.name, 'exercício', 80);
    const muscle = requireText(body.muscle, 'grupo muscular', 40);
    insertExercise(requireId(params.id), name, muscle);
    db.prepare('INSERT OR IGNORE INTO exercise_library (name, muscle) VALUES (?, ?)').run(name, muscle);
  }));

  router.patch('/api/exercises/:id', mutate(({ params, body }) => {
    db.prepare('UPDATE exercises SET name = ?, muscle = ?, target = ?, rest = ? WHERE id = ?').run(
      requireText(body.name, 'exercício', 80),
      requireText(body.muscle, 'grupo muscular', 40),
      requireText(body.target, 'repetições alvo', 12),
      requireNumber(body.rest, 'descanso', 0, 1200),
      requireId(params.id),
    );
  }));

  router.delete('/api/exercises/:id', mutate(({ params }) => {
    const id = requireId(params.id);
    db.prepare(`DELETE FROM session_sets WHERE exercise_id = ? AND session_id IN (SELECT id FROM sessions WHERE status = 'active')`).run(id);
    db.prepare('DELETE FROM exercises WHERE id = ?').run(id);
  }));

  router.post('/api/exercises/:id/sets', mutate(({ params }) => {
    const id = requireId(params.id);
    const last = db.prepare('SELECT * FROM sets WHERE exercise_id = ? ORDER BY position DESC LIMIT 1').get(id) as SetRow | undefined;
    db.prepare('INSERT INTO sets (exercise_id, position, load, reps) VALUES (?, ?, ?, ?)').run(id, (last?.position ?? -1) + 1, last?.load ?? '', last?.reps ?? '');
  }));

  router.patch('/api/sets/:id', mutate(({ params, body }) => {
    const id = requireId(params.id);
    const load = String(body.load ?? '').replace(/[^0-9,.]/g, '').slice(0, 8);
    const reps = String(body.reps ?? '').replace(/[^0-9]/g, '').slice(0, 4);
    db.prepare('UPDATE sets SET load = ?, reps = ? WHERE id = ?').run(load, reps, id);
    db.prepare(`UPDATE session_sets SET load = ?, reps = ? WHERE set_id = ? AND session_id IN (SELECT id FROM sessions WHERE status = 'active')`).run(load, reps, id);
  }));

  router.delete('/api/sets/:id', mutate(({ params }) => {
    const id = requireId(params.id);
    db.prepare(`DELETE FROM session_sets WHERE set_id = ? AND session_id IN (SELECT id FROM sessions WHERE status = 'active')`).run(id);
    db.prepare('DELETE FROM sets WHERE id = ?').run(id);
  }));

  router.post('/api/sessions', mutate((ctx) => {
    if (activeRow()) throw new HttpError(409, 'Já existe um treino em andamento');
    db.prepare('INSERT INTO sessions (workout_id, date) VALUES (?, ?)').run(requireId(String(ctx.body.workoutId)), todayOf(ctx));
  }));

  // Marks or unmarks a set and moves the rest timer. The client sends the end time
  // from its own clock, so the countdown on that device is always right.
  router.patch('/api/sessions/:id', mutate(({ params, body }) => {
    const session = requireActive(requireId(params.id));
    if (body.set) {
      const setId = requireId(String(body.set.id));
      if (body.set.done) {
        const row = db.prepare('SELECT * FROM sets WHERE id = ?').get(setId) as SetRow | undefined;
        if (!row) badRequest('Série não encontrada');
        const { i } = db.prepare('SELECT COUNT(*) AS i FROM sets WHERE exercise_id = ? AND position < ?').get(row.exercise_id, row.position) as { i: number };
        db.prepare('INSERT OR REPLACE INTO session_sets (session_id, set_id, exercise_id, set_index, load, reps) VALUES (?, ?, ?, ?, ?, ?)').run(session.id, setId, row.exercise_id, i, row.load, row.reps);
      } else {
        db.prepare('DELETE FROM session_sets WHERE session_id = ? AND set_id = ?').run(session.id, setId);
      }
    }
    if ('rest' in body) {
      db.prepare('UPDATE sessions SET rest_end = ?, rest_total = ? WHERE id = ?').run(body.rest ? requireNumber(body.rest.end, 'descanso', 0, Number.MAX_SAFE_INTEGER) : null, body.rest ? requireNumber(body.rest.total, 'descanso', 0, 7200) : null, session.id);
    }
  }));

  router.post('/api/sessions/:id/finish', mutate(({ params }) => {
    const session = requireActive(requireId(params.id));
    db.prepare(`UPDATE sessions SET status = 'done', rest_end = NULL, rest_total = NULL WHERE id = ?`).run(session.id);
    ensureDay(session.date);
    db.prepare('UPDATE days SET musc = 1, workout_id = ?, workout_label = ? WHERE date = ?').run(session.workout_id, labelOf(session.workout_id), session.date);
  }));

  router.delete('/api/sessions/:id', mutate(({ params }) => {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(requireActive(requireId(params.id)).id);
  }));
}
