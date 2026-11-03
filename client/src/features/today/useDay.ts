import { useCallback, useEffect, useRef, useState } from 'react';
import type { Day } from '../../../../shared/types.ts';
import { api } from '../../api.ts';
import { toastError } from '../../components/Toast.tsx';

export function useDay(date: string) {
  const [day, setDay] = useState<Day | null>(null);
  const latest = useRef(0);

  const load = useCallback(() => {
    const id = ++latest.current;
    api.day(date).then((next) => {
      if (id === latest.current) setDay(next);
    }, toastError);
  }, [date]);

  useEffect(load, [load]);

  /** Applies an optional instant change, then settles on what the server answers. */
  const run = useCallback((request: Promise<Day>, optimistic?: (day: Day) => Day) => {
    const id = ++latest.current;
    if (optimistic) setDay((current) => current && optimistic(current));
    return request.then(
      (next) => {
        if (id === latest.current) setDay(next);
      },
      (err) => {
        toastError(err);
        load();
      },
    );
  }, [load]);

  return { day, run };
}
