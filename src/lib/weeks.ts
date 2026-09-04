import { civil, formatDateShort, zonedMidnightMs } from './format';

/**
 * ISO-8601-Kalenderwochen-Helfer (Montag als Wochenbeginn).
 *
 * Gerechnet wird auf dem Kalenderdatum in der Zeitzone des Nutzers (siehe
 * format.ts) – in UTC läge ein Training am Sonntagabend nach 22:00 Ortszeit
 * schon in der Folgewoche. `workout_logs.date` liegt als Unix-SEKUNDEN vor,
 * deshalb arbeiten die Grenzen hier mit Sekunden.
 *
 * Die reine Wochen-Arithmetik (ISO-Donnerstag, Jan-4-Anker) rechnet weiter mit
 * `Date.UTC`, weil sie auf Kalendertagen ohne Uhrzeit operiert. Erst beim
 * Umrechnen in Zeitstempel kommt die Zeitzone ins Spiel.
 */

export type IsoWeek = { year: number; week: number; weekKey: string };

/** ISO-Kalenderwoche eines Zeitpunkts. Wochenkey "2026-35" = ISO-Jahr + KW. */
export function isoWeek(date: Date): IsoWeek {
  const c = civil(date);
  const d = new Date(Date.UTC(c.year, c.month - 1, c.day));
  const dayNum = d.getUTCDay() || 7; // ISO-Wochentag: Mon=1 … Son=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Donnerstag dieser ISO-Woche
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  const year = d.getUTCFullYear();
  return { year, week, weekKey: `${year}-${String(week).padStart(2, '0')}` };
}

/** "2026-35" -> {year, week}; null bei ungültigem Format oder ungültiger Woche. */
export function parseWeekKey(key: string): { year: number; week: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) return null;
  return { year, week };
}

/** Kalendertag des Montags einer ISO-Woche (Anker: ISO-Woche 1 enthält den 4.1.). */
function mondayCivil(year: number, week: number): { year: number; month: number; day: number } {
  const jan4 = Date.UTC(year, 0, 4);
  const dayNum = (new Date(jan4).getUTCDay() + 6) % 7; // Mo=0 … So=6
  const monday = new Date(jan4 - dayNum * 86_400_000 + (week - 1) * 604_800_000);
  return {
    year: monday.getUTCFullYear(),
    month: monday.getUTCMonth() + 1,
    day: monday.getUTCDate(),
  };
}

/** Montag 00:00 Ortszeit der Woche. */
export function mondayOfWeek(year: number, week: number): Date {
  const m = mondayCivil(year, week);
  return new Date(zonedMidnightMs(m.year, m.month, m.day));
}

/**
 * Exklusive Sekunden-Grenzen [fromSec, toSec) einer Woche für
 * `WHERE wl.date >= from AND wl.date < to`. null bei ungültigem Key.
 *
 * Das Ende ist der Montag der Folgewoche um 00:00 Ortszeit – nicht from + 7
 * Tage, denn eine Woche mit Zeitumstellung hat 23 bzw. 25 Stunden.
 */
export function weekBoundsSec(key: string): { fromSec: number; toSec: number } | null {
  const parsed = parseWeekKey(key);
  if (!parsed) return null;
  const from = mondayOfWeek(parsed.year, parsed.week);
  const next = new Date(from.getTime() + 8 * 86_400_000); // sicher in der Folgewoche
  const nextMonday = isoWeek(next);
  const to = mondayOfWeek(nextMonday.year, nextMonday.week);
  return { fromSec: Math.floor(from.getTime() / 1000), toSec: Math.floor(to.getTime() / 1000) };
}

/** "2026-35" -> "KW 35" */
export function weekLabel(key: string): string {
  const parsed = parseWeekKey(key);
  return parsed ? `KW ${parsed.week}` : key;
}

/** "24.08. – 30.08.2026" aus den exklusiven Sekunden-Grenzen. */
export function weekRangeLabel(fromSec: number, toSec: number): string {
  const start = new Date(fromSec * 1000);
  const end = new Date((toSec - 1) * 1000); // letzter Moment (Sonntag) der Woche
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}
