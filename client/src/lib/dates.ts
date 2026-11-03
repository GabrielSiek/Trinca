const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');

const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseISO(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Whole days from `a` to `b`. Noon avoids daylight-saving surprises. */
export function diffDays(a: string, b: string): number {
  const noon = (iso: string) => parseISO(iso).getTime() + 12 * 3600 * 1000;
  return Math.round((noon(b) - noon(a)) / 86400000);
}

export const clampDate = (iso: string, min: string, max: string) => (iso < min ? min : iso > max ? max : iso);

export const weekday = (iso: string) => WEEKDAYS[parseISO(iso).getDay()];
export const weekdayShort = (iso: string) => weekday(iso).slice(0, 3);
export const dateLong = (iso: string) => `${parseISO(iso).getDate()} de ${MONTHS[parseISO(iso).getMonth()]}`;
export const dateShort = (iso: string) => `${parseISO(iso).getDate()} ${MONTHS[parseISO(iso).getMonth()].slice(0, 3)}`;
export const ddmm = (iso: string) => `${pad(parseISO(iso).getDate())}/${pad(parseISO(iso).getMonth() + 1)}`;
export const monthName = (month: number) => MONTHS[month].charAt(0).toUpperCase() + MONTHS[month].slice(1);

export interface CalendarCell {
  day: number;
  iso: string;
}

/** Sunday-first grid for a month, with nulls padding both ends. */
export function monthGrid(year: number, month: number): (CalendarCell | null)[] {
  const first = new Date(year, month, 1).getDay();
  const length = new Date(year, month + 1, 0).getDate();
  const cells: (CalendarCell | null)[] = Array.from({ length: first }, () => null);
  for (let day = 1; day <= length; day++) cells.push({ day, iso: `${year}-${pad(month + 1)}-${pad(day)}` });
  while (cells.length % 7) cells.push(null);
  return cells;
}
