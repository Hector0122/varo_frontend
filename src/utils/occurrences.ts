import { parseIsoDate, toIsoDate } from './dates';

export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';

/** n-ésima fecha a partir de la primera (mensual/anual se ajusta a fin de mes). */
function nth(first: Date, frequency: Frequency, n: number): Date {
  const y = first.getFullYear();
  const m = first.getMonth();
  const d = first.getDate();
  if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
    return new Date(y, m, d + n * (frequency === 'WEEKLY' ? 7 : 14));
  }
  const months = frequency === 'MONTHLY' ? n : n * 12;
  const lastDay = new Date(y, m + months + 1, 0).getDate();
  return new Date(y, m + months, Math.min(d, lastDay));
}

/**
 * Separa las fechas de un gasto/ingreso fijo: las que ya pasaron (hasta hoy,
 * para registrarlas de una vez) y la siguiente (desde ahí sigue el backend).
 */
export function splitOccurrences(firstIso: string, frequency: Frequency, todayIso: string) {
  const first = parseIsoDate(firstIso);
  const past: string[] = [];
  for (let n = 0; n < 1000; n++) {
    const iso = toIsoDate(nth(first, frequency, n));
    if (iso > todayIso) return { past, next: iso };
    past.push(iso);
  }
  return { past, next: todayIso };
}
