export function parseIsoDate(value: string): Date {
  const [y, m, d] = (value || '').split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Hoy en hora local (toISOString usa UTC: después de las 18:00 en México ya es "mañana"). */
export const todayIso = () => toIsoDate(new Date());
