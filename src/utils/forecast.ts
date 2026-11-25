import { parseIsoDate, toIsoDate } from './dates';
import { datesBetween, type Frequency } from './occurrences';

export interface ForecastRecurring {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  frequency: Frequency | 'DAILY';
  startDate: string; // ISO
  endDate?: string | null;
  isActive: boolean;
}

export interface ForecastCard {
  name: string;
  dueDay: number; // día del mes en que vence el pago
  nextPayment: number; // capturado a mano; 0 = usar el estimado
  estimate: number; // lo cargado en el periodo actual (incluye mensualidades a meses)
}

export interface ForecastInput {
  balance: number;
  balanceDate: string; // ISO: el saldo es al final de ese día
  today: string; // ISO
  ratePct: number; // rendimiento anual
  weeks: number;
  recurring: ForecastRecurring[];
  cards: ForecastCard[];
  variableWeekly: number;
}

export interface ForecastEvent {
  date: string;
  label: string;
  amount: number; // + entra, − sale
}

export interface ForecastWeek {
  start: string;
  end: string;
  events: ForecastEvent[];
  endBalance: number;
}

/**
 * Gasto semanal que sale de la cuenta (efectivo o débito de la cuenta, no tarjeta),
 * sin fijos ni transferencias, desde `since`.
 */
export function weeklyCashSpending(
  transactions: { type: string; date: string; amount: number | string; category: string; note?: string | null; objectiveEntry?: { type: string } | null }[],
  since: string,
  days: number,
  isLinked: (category: string) => boolean,
) {
  const total = transactions
    .filter(
      t =>
        t.type === 'EXPENSE' &&
        t.date.slice(0, 10) >= since &&
        t.objectiveEntry?.type !== 'INCREASE' && // compras con tarjeta no salen de la cuenta
        !isLinked(t.category) &&
        !/recurrente/i.test(t.note ?? ''),
    )
    .reduce((s, t) => s + Number(t.amount), 0);
  return (total / days) * 7;
}

const addDays =(iso: string, n: number) => {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
};

/** Días de pago de una tarjeta (cada mes en `dueDay`) en (after, until]. */
function cardDueDates(dueDay: number, afterIso: string, untilIso: string) {
  const a = parseIsoDate(afterIso);
  const firstMonth = new Date(a.getFullYear(), a.getMonth() - 1, Math.min(dueDay, 28));
  return datesBetween(toIsoDate(firstMonth), 'MONTHLY', afterIso, untilIso).map(iso => {
    // datesBetween ancla en el día del primer mes; corrige a dueDay (ajustado a fin de mes).
    const d = parseIsoDate(iso);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return toIsoDate(new Date(d.getFullYear(), d.getMonth(), Math.min(dueDay, last)));
  });
}

/**
 * Simula el saldo de la cuenta día por día desde el último "Actualizar saldo":
 * fijos en su fecha, pagos de tarjeta en su vencimiento, gasto variable
 * repartido por día y rendimiento diario sobre saldo positivo.
 * Lo que pasó entre la fecha del saldo y hoy ya cuenta para el saldo de hoy.
 */
export function buildForecast(input: ForecastInput) {
  const end = addDays(input.today, input.weeks * 7);
  const events: ForecastEvent[] = [];

  for (const r of input.recurring) {
    if (!r.isActive) continue;
    const until = r.endDate && r.endDate < end ? r.endDate : end;
    for (const date of datesBetween(r.startDate.slice(0, 10), r.frequency, input.balanceDate, until)) {
      events.push({ date, label: r.category, amount: r.type === 'INCOME' ? r.amount : -r.amount });
    }
  }
  for (const c of input.cards) {
    cardDueDates(c.dueDay, input.balanceDate, end).forEach(date => {
      // El pago capturado aplica al próximo vencimiento desde hoy; los demás, al estimado.
      const first = date >= input.today && !events.some(e => e.label === `Pago ${c.name}` && e.date >= input.today);
      const amount = first && c.nextPayment > 0 ? c.nextPayment : c.estimate;
      if (amount > 0) events.push({ date, label: `Pago ${c.name}`, amount: -amount });
    });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  const daily = input.variableWeekly / 7;
  const rate = input.ratePct / 100 / 365;
  let balance = input.balance;
  let todayBalance = input.balance;
  let min = { balance: Infinity, date: input.today };
  const byDay = new Map<string, number>();
  for (const e of events) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amount);
  const balances = new Map<string, number>();

  for (let day = addDays(input.balanceDate, 1); day <= end; day = addDays(day, 1)) {
    // Hasta hoy lo gastado ya está anotado (y lo pagado con la cuenta ya bajó el saldo): el promedio solo proyecta el futuro.
    balance += (byDay.get(day) ?? 0) - (day > input.today ? daily : 0);
    if (balance > 0) balance += balance * rate;
    balances.set(day, balance);
    if (day === input.today) todayBalance = balance;
    if (day > input.today && balance < min.balance) min = { balance, date: day };
  }
  if (input.balanceDate >= input.today) todayBalance = input.balance;

  const weeks: ForecastWeek[] = [];
  for (let i = 0; i < input.weeks; i++) {
    const start = addDays(input.today, i * 7 + 1);
    const wEnd = addDays(input.today, (i + 1) * 7);
    weeks.push({
      start,
      end: wEnd,
      events: events.filter(e => e.date >= start && e.date <= wEnd),
      endBalance: balances.get(wEnd) ?? balance,
    });
  }
  const endBalance = balances.get(end) ?? balance;
  return {
    todayBalance,
    endBalance,
    weeklyFree: (endBalance - todayBalance) / input.weeks,
    min,
    weeks,
  };
}
