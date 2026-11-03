import type { Measure, ProgressData, ProgressDay } from '../../../shared/types.ts';
import { db } from '../db.ts';
import { optionalNumber, requireDate, type Router } from '../http.ts';

function loadProgress(): ProgressData {
  const days = db.prepare('SELECT date, weight, musc, activity FROM days ORDER BY date').all() as unknown as (Omit<ProgressDay, 'musc'> & { musc: number })[];
  const measures = db.prepare('SELECT * FROM measures ORDER BY date').all() as unknown as Measure[];
  return { days: days.map((day) => ({ ...day, musc: !!day.musc })), measures };
}

export function progressRoutes(router: Router) {
  router.get('/api/progress', () => loadProgress());

  router.put('/api/measures/:date', ({ params, body }) => {
    db.prepare('INSERT OR REPLACE INTO measures (date, belly, navel, arm) VALUES (?, ?, ?, ?)').run(
      requireDate(params.date),
      optionalNumber(body.belly, 'barriga', 300),
      optionalNumber(body.navel, 'umbigo', 300),
      optionalNumber(body.arm, 'braço', 300),
    );
    return loadProgress();
  });
}
