/**
 * Globales Ratelimit für Gemini-Aufrufe.
 *
 * Der Google-AI-Studio-Free-Tier erlaubt 15 Anfragen pro Minute und Projekt.
 * Wird das überschritten, antwortet Google mit HTTP 429 – und unser Retry
 * würde das Kontingent zusätzlich verbrennen. Deshalb reservieren wir vor
 * *jedem* HTTP-Call (Retries eingeschlossen) einen Slot in D1.
 *
 * Warum D1 und keine Modul-Variable? Ein Worker läuft in beliebig vielen
 * Isolates parallel, jeder mit eigenem Speicher. Nur ein gemeinsamer Speicher
 * kann global zählen; D1 ist ohnehin gebunden.
 *
 * Das Fenster ist gleitend (letzte 60 s), nicht "pro Kalenderminute" – sonst
 * könnten an einer Minutengrenze 2 × 14 Calls in kurzer Folge durchgehen.
 */

/** Fensterbreite in ms – Googles Limit ist "pro Minute". */
const WINDOW_MS = 60_000;

/** Default-Budget: 14 statt 15, damit ein Zählfehler nicht sofort ins 429 läuft. */
export const DEFAULT_AI_RPM = 14;

export type AiQuotaResult =
  | { ok: true }
  /** Kein Slot frei; `retryAfterSec` = Sekunden bis der älteste Slot verfällt. */
  | { ok: false; retryAfterSec: number };

/** Liest das Budget aus der Umgebung (GEMINI_RPM) und hält es in sinnvollen Grenzen. */
export function aiRpmLimit(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_AI_RPM;
  return Math.min(Math.floor(n), 15);
}

/**
 * Versucht, einen Slot im aktuellen 60-s-Fenster zu belegen.
 *
 * Der INSERT prüft die Auslastung in derselben Anweisung (`WHERE (SELECT
 * COUNT(*) …) < limit`). SQLite führt sie atomar aus, deshalb können zwei
 * gleichzeitige Requests das Limit nicht gemeinsam überschreiten – bei
 * belegtem Fenster schreibt der INSERT schlicht keine Zeile. `RETURNING id`
 * macht genau das sichtbar: leeres `results` = kein Slot bekommen.
 */
export async function reserveAiSlot(db: D1Database, limit: number): Promise<AiQuotaResult> {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const [, inserted] = await db.batch<{ id: number }>([
    // Housekeeping: alles außerhalb des Fensters ist bedeutungslos.
    db.prepare('DELETE FROM ai_requests WHERE created_at <= ?1').bind(windowStart),
    db
      .prepare(
        `INSERT INTO ai_requests (created_at)
         SELECT ?1 WHERE (SELECT COUNT(*) FROM ai_requests WHERE created_at > ?2) < ?3
         RETURNING id`,
      )
      .bind(now, windowStart, limit),
  ]);

  if ((inserted.results?.length ?? 0) > 0) return { ok: true };

  const oldest = await db
    .prepare('SELECT MIN(created_at) AS ts FROM ai_requests WHERE created_at > ?1')
    .bind(windowStart)
    .first<{ ts: number | null }>();

  const freeAt = (oldest?.ts ?? now) + WINDOW_MS;
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil((freeAt - now) / 1000)) };
}
