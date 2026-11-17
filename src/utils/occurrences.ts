import { parseIsoDate, toIsoDate } from './dates';

export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'YEARLY';

const MONTHS: Partial<Record<Frequency, number>> = { MONTHLY: 1, BIMONTHLY: 2, YEARLY: 12 };

/** n-ésima fecha a partir de la primera (los meses se ajustan a fin de mes sin correrse). */
export function nthDate(first: Date, frequency: Frequency | 'DAILY', n: number): Date {
  const y = first.getFullYear();
  const m = first.getMonth();
  const d = first.getDate();
  if (frequency === 'DAILY') return new Date(y, m, d + n);
  if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
    return new Date(y, m, d + n * (frequency === 'WEEKLY' ? 7 : 14));
  }
  const months = MONTHS[frequency]! * n;
  const lastDay = new Date(y, m + months + 1, 0).getDate();
  return new Date(y, m + months, Math.min(d, lastDay));
}

/** Fechas ISO de `first` según la frecuencia que caen en (after, until]. */
export function datesBetween(firstIso: string, frequency: Frequency | 'DAILY', afterIso: string, untilIso: string) {
  const first = parseIsoDate(firstIso);
  const out: string[] = [];
  for (let n = 0; n < 5000; n++) {
    const iso = toIsoDate(nthDate(first, frequency, n));
    if (iso > untilIso) break;
    if (iso > afterIso) out.push(iso);
  }
  return out;
}

/**
 * Separa las fechas de un gasto/ingreso fijo: las que ya pasaron (hasta hoy,
 * para registrarlas de una vez) y la siguiente (desde ahí sigue el backend).
 */
export function splitOccurrences(firstIso: string, frequency: Frequency, todayIso: string) {
  const first = parseIsoDate(firstIso);
  const past: string[] = [];
  for (let n = 0; n < 1000; n++) {
    const iso = toIsoDate(nthDate(first, frequency, n));
    if (iso > todayIso) return { past, next: iso };
    past.push(iso);
  }
  return { past, next: todayIso };
}
