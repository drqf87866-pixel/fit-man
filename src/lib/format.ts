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

/**
 * Alle Datumsangaben werden in der Zeitzone des Nutzers dargestellt, nicht in
 * UTC. Sonst landet ein Training am Sonntagabend nach 22:00 Ortszeit im
 * nächsten Kalendertag – und damit in der falschen ISO-Woche (siehe weeks.ts).
 * Die gespeicherten Werte bleiben unverändert Unix-Sekunden.
 */
export const TZ = 'Europe/Berlin';

const TZ_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** Kalenderdatum und Uhrzeit eines Zeitpunkts in TZ. */
export type Civil = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function civil(date: Date): Civil {
  const parts: Record<string, string> = {};
  for (const p of TZ_FORMAT.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // 'hour12: false' liefert je nach ICU-Version 24 statt 00 für Mitternacht.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Versatz TZ gegenüber UTC in Millisekunden zum gegebenen Zeitpunkt. */
function tzOffsetMs(date: Date): number {
  const c = civil(date);
  const asUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Zeitpunkt (ms) von 00:00 Ortszeit des angegebenen Kalendertags.
 * Zweiter Durchlauf, weil der Versatz an DST-Wechseln vom Ergebnis abhängt.
 */
export function zonedMidnightMs(year: number, month: number, day: number): number {
  const naive = Date.UTC(year, month - 1, day);
  const once = naive - tzOffsetMs(new Date(naive));
  return naive - tzOffsetMs(new Date(once));
}

/** Kalendertag als Tageszahl – Basis für Differenzen ohne Uhrzeit-Rauschen. */
const dayNumber = (c: Civil) => Date.UTC(c.year, c.month - 1, c.day) / 86_400_000;

export function formatDate(date: Date): string {
  const c = civil(date);
  const weekday = new Date(Date.UTC(c.year, c.month - 1, c.day)).getUTCDay();
  return `${DAYS[weekday]}, ${formatDateShort(date)}`;
}

export function formatDateShort(date: Date): string {
  const c = civil(date);
  return `${pad2(c.day)}.${pad2(c.month)}.${c.year}`;
}

/** "Heute" / "Gestern" / "vor 3 Tagen" / Datum */
export function formatRelative(date: Date, now = new Date()): string {
  const diff = dayNumber(civil(now)) - dayNumber(civil(date));
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

/**
 * Geschätztes 1RM nach Epley: kg × (1 + Wdh/30).
 * Nur eine Schätzung – bei sehr hohen Wiederholungszahlen zunehmend ungenau,
 * deshalb ab 15 Wdh. nicht mehr ausgewiesen (null).
 */
export function estimateOneRepMax(kg: number, reps: number): number | null {
  if (kg <= 0 || reps <= 0 || reps > 15) return null;
  if (reps === 1) return kg;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}
