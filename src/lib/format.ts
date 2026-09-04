/** Eindeutige ID – wird für Batch-Inserts vorab auf dem Server erzeugt. */
export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

/** 4215 -> "1:10:15", 185 -> "3:05" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** "45 Min" bzw. "1 Std 12 Min" für Listenansichten */
export function formatDurationLong(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} Min`;
  const h = Math.floor(m / 60);
  return `${h} Std ${m % 60} Min`;
}

const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatDate(date: Date): string {
  return `${DAYS[date.getUTCDay()]}, ${formatDateShort(date)}`;
}

export function formatDateShort(date: Date): string {
  return `${pad2(date.getUTCDate())}.${pad2(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

/** "Heute" / "Gestern" / "vor 3 Tagen" / Datum */
export function formatRelative(date: Date, now = new Date()): string {
  const day = 86_400_000;
  const a = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = Math.round((b - a) / day);
  if (diff <= 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (diff < 7) return `vor ${diff} Tagen`;
  return formatDateShort(date);
}

/** 62.5 -> "62,5" · 60 -> "60" */
export function formatWeight(kg: number): string {
  return (Math.round(kg * 100) / 100).toString().replace('.', ',');
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(Math.round(kg / 100) / 10).toString().replace('.', ',')} t`;
  return `${Math.round(kg)} kg`;
}
