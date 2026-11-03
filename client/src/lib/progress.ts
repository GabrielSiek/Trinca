import type { Cycle, Measure, ProgressData, ProgressDay } from '../../../shared/types.ts';
import { addDays, ddmm, diffDays } from './dates.ts';
import { dec } from './format.ts';

const WEEK = 7;

export function cycleInfo(cycle: Cycle, today: string) {
  const end = addDays(cycle.start, cycle.days - 1);
  const index = Math.max(0, Math.min(cycle.days - 1, diffDays(cycle.start, today)));
  return { end, index, dayNumber: index + 1, daysDone: index + 1, daysLeft: cycle.days - index - 1 };
}

const within = (date: string, from: string, to: string) => date >= from && date <= to;

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

const weightsBetween = (days: ProgressDay[], from: string, to: string) =>
  days.filter((d) => d.weight !== null && within(d.date, from, to)).map((d) => d.weight as number);

/** Mean of the weigh-ins in the seven days ending on `date`, skipping days not weighed. */
export const rollingMean = (days: ProgressDay[], date: string) => mean(weightsBetween(days, addDays(date, -(WEEK - 1)), date));

export type Advice = 'Início' | 'Mantenha' | 'Reduza' | 'Aumente' | 'Fim do cutting' | '';

export interface WeekRow {
  n: number;
  date: string;
  mean: number | null;
  change: number | null;
  measure: Measure | null;
  musc: number | null;
  activity: number | null;
  advice: Advice;
  current: boolean;
  closed: boolean;
}

function adviceFor(change: number, cycle: Cycle): Advice {
  const drop = -change;
  if (drop < cycle.rateMin) return 'Reduza';
  return drop > cycle.rateMax ? 'Aumente' : 'Mantenha';
}

export function buildWeeks(cycle: Cycle, data: ProgressData, today: string): WeekRow[] {
  const count = Math.ceil((cycle.days - 1) / WEEK);
  const rows: WeekRow[] = [];
  for (let n = 0; n <= count; n++) {
    const date = addDays(cycle.start, n * WEEK);
    const from = n === 0 ? date : addDays(date, -(WEEK - 1));
    const closed = today >= date;
    const current = within(today, from, date);
    const started = today >= from;
    const inWeek = data.days.filter((d) => within(d.date, from, date) && d.date <= today);
    const weekMean = mean(weightsBetween(data.days, from, date));
    const previous = rows[n - 1]?.mean ?? null;
    const change = weekMean !== null && previous !== null ? weekMean - previous : null;
    const measures = data.measures.filter((m) => within(m.date, from, date));
    let advice: Advice = '';
    if (n === 0) advice = 'Início';
    else if (n === count) advice = 'Fim do cutting';
    else if (closed && change !== null) advice = adviceFor(change, cycle);
    rows.push({
      n,
      date,
      mean: weekMean,
      change,
      measure: measures[measures.length - 1] ?? null,
      musc: started ? inWeek.filter((d) => d.musc).length : null,
      activity: started ? inWeek.filter((d) => d.activity !== 'nenhuma').length : null,
      advice,
      current,
      closed,
    });
  }
  return rows;
}

export interface Adjustment {
  title: string;
  text: string;
  nextReview: string | null;
}

export function weekAdjustment(cycle: Cycle, weeks: WeekRow[], today: string): Adjustment {
  const next = weeks.find((w) => w.date > today)?.date ?? null;
  const target = `O alvo é de ${dec(cycle.rateMin, 2)} a ${dec(cycle.rateMax, 1)} kg por semana`;
  const last = [...weeks].reverse().find((w) => w.closed && w.change !== null);
  if (!last) {
    const first = weeks[1]?.date;
    return { title: 'Início', text: `A primeira revisão sai em ${first ? ddmm(first) : '—'}, com a média dos primeiros 7 dias.`, nextReview: next };
  }
  const change = last.change as number;
  const moved = change > 0 ? `A média subiu ${dec(change, 2)} kg` : `A média caiu ${dec(-change, 2)} kg`;
  const advice = adviceFor(change, cycle);
  if (advice === 'Mantenha') return { title: advice, text: `${moved}. ${target}.`, nextReview: next };
  const action = advice === 'Reduza' ? 'reduza um pouco as calorias' : 'aumente um pouco as calorias';
  return { title: advice, text: `${moved}. ${target}: ${action}.`, nextReview: next };
}

export function workoutSummary(cycle: Cycle, data: ProgressData, today: string) {
  const days = data.days.filter((d) => d.date >= cycle.start && d.date <= today);
  const musc = days.filter((d) => d.musc).length;
  const elapsed = Math.max(1, diffDays(cycle.start, today) + 1);
  const active = days.filter((d) => d.activity !== 'nenhuma');
  const label: Record<string, string> = { basquete: 'basquete', futebol: 'futebol', outra: 'outra' };
  const breakdown = Object.keys(label)
    .map((id) => ({ id, count: active.filter((d) => d.activity === id).length }))
    .filter((a) => a.count)
    .map((a) => `${a.count} ${label[a.id]}`)
    .join(' · ');
  return {
    musc,
    perWeek: Math.round(musc / Math.max(1, elapsed / WEEK)),
    activity: active.length,
    breakdown,
    both: active.filter((d) => d.musc).length,
  };
}
