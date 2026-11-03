export const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');

export const dec = (n: number, digits = 1) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function signed(n: number, digits = 1): string {
  const factor = 10 ** digits;
  const value = Math.round(n * factor) / factor;
  return (value > 0 ? '+' : value < 0 ? '−' : '±') + dec(Math.abs(value), digits);
}

export const pct = (x: number) => `${Math.max(0, Math.min(100, x * 100)).toFixed(2)}%`;

export function parseDecimal(text: string): number | null {
  const value = parseFloat(text.trim().replace(',', '.'));
  return Number.isNaN(value) ? null : value;
}

export const decimalInput = (value: number | null) => (value === null ? '' : String(value).replace('.', ','));

export function clock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
}
