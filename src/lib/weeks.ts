import { formatDateShort } from './format';

/**
 * ISO-8601-Kalenderwochen-Helfer (UTC, Montag als Wochenbeginn).
 *
 * Passt zur restlichen App, die alle Datumslogik in UTC rechnet (siehe
 * format.ts). `workout_logs.date` liegt als Unix-SEKUNDEN vor – deshalb
 * arbeiten die Grenzen hier mit Sekunden.
 */

export type IsoWeek = { year: number; week: number; weekKey: string };

/**
 * ISO-Kalenderwoche eines Datums (UTC).
 * Wochenkey "2026-35" = ISO-Jahr + zweistellige Kalenderwoche.
 */
export function isoWeek(date: Date): IsoWeek {
  // Kopie auf UTC-Mitternacht des Tages.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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

/** UTC-Montag 00:00 der Woche (Anker: ISO-Woche 1 = Woche mit dem 4. Januar). */
export function mondayOfWeek(year: number, week: number): Date {
  const jan4 = Date.UTC(year, 0, 4);
  const dayNum = (new Date(jan4).getUTCDay() + 6) % 7; // Mo=0 … So=6
  const jan4Monday = jan4 - dayNum * 86_400_000;
  return new Date(jan4Monday + (week - 1) * 604_800_000);
}

/**
 * Exklusive Sekunden-Grenzen [fromSec, toSec) einer Woche für
 * `WHERE wl.date >= from AND wl.date < to`. null bei ungültigem Key.
 */
export function weekBoundsSec(key: string): { fromSec: number; toSec: number } | null {
  const parsed = parseWeekKey(key);
  if (!parsed) return null;
  const from = mondayOfWeek(parsed.year, parsed.week);
  const fromSec = Math.floor(from.getTime() / 1000);
  return { fromSec, toSec: fromSec + 7 * 86_400 };
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
