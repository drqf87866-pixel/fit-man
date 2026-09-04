import type { Bindings } from '../types';

/**
 * Schlanker Gemini-Client für schema-gebundenen JSON-Output.
 *
 * Verwendet die REST-API von Google AI Studio direkt aus dem Worker (fetch),
 * der API-Key liegt als Secret (`wrangler secret put GEMINI_API_KEY`).
 *
 * Hinweise:
 * - Modellwahl: `gemini-3.1-flash-lite` antwortet auf unseren Payloads in
 *   2–11 s. `gemini-3.5-flash-lite` brauchte bei identischem Prompt
 *   (169 Prompt-Tokens, 124 Antwort-Tokens, keine Thinking-Tokens) 34–109 s
 *   und lief damit ins Timeout – das ist Kapazität auf Google-Seite, nicht
 *   Prompt-Größe. Bei Modellwechsel also immer die Latenz mitmessen.
 * - Es wird kein `temperature` gesendet: Flash-Lite unterstützt keine eigenen
 *   Sampling-Werte, und für JSON im `responseSchema` ist es ohnehin unnötig.
 * - Flüchtige Fehler (Timeout, 429, 5xx, leere Antwort) werden automatisch
 *   wiederholt. Das Budget ist bewusst gedeckelt (Default 3 × 20 s + Backoff
 *   ≈ 62 s), damit die Antwort noch vor Cloudflares Verbindungslimit steht
 *   und der Nutzer nicht minutenlang auf ein leeres Formular wartet.
 */

export type GeminiErrorCode = 'missing-key' | 'timeout' | 'http' | 'empty' | 'parse';

export class GeminiError extends Error {
  code: GeminiErrorCode;
  status?: number;
  detail?: string;

  constructor(
    code: GeminiErrorCode,
    message: string,
    opts?: { status?: number; detail?: string },
  ) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    if (opts?.status !== undefined) this.status = opts.status;
    if (opts?.detail !== undefined) this.detail = opts.detail;
  }
}

export type GeminiJsonOptions = {
  /** system_instruction – Deutsch, definiert Rolle + harte Regeln */
  system: string;
  /** Nutzerinhalt (Daten!) */
  user: string;
  /** responseSchema als JSON-Schema (OpenAPI-Subset, Typen OBJECT/ARRAY/…) */
  schema: Record<string, unknown>;
  /** Optionales Modell, Default: env.GEMINI_MODEL ?? "gemini-3.1-flash-lite" */
  model?: string;
  /** Timeout pro Versuch in ms, Default 20_000 */
  timeoutMs?: number;
  /** Maximale Versuche bei transienten Fehlern, Default 3 */
  maxAttempts?: number;
  /** Obergrenze für die Antwort, Default 2048 (unsere Schemata bleiben weit darunter) */
  maxOutputTokens?: number;
  /** Pause zwischen Versuchen in ms, Default 800 */
  backoffMs?: number;
};

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** HTTP-Status, die ein erneuter Versuch sinnvoll beantworten könnte. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Führt einen schema-typisierten Gemini-Aufruf aus und parst das JSON-Antwortfeld. */
export async function geminiJson<T>(
  env: Pick<Bindings, 'GEMINI_API_KEY' | 'GEMINI_MODEL'>,
  opts: GeminiJsonOptions,
): Promise<T> {
  if (!env.GEMINI_API_KEY) {
    throw new GeminiError('missing-key', 'GEMINI_API_KEY ist nicht gesetzt (Worker-Secret).');
  }

  const model = opts.model ?? env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
  const backoffMs = opts.backoffMs ?? 800;

  let lastError: GeminiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: opts.system }] },
          contents: [{ role: 'user', parts: [{ text: opts.user }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: opts.schema,
            maxOutputTokens: opts.maxOutputTokens ?? 2048,
          },
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        console.error('[fit-man] Gemini http', res.status, detail.slice(0, 300));
        const err = new GeminiError('http', `Gemini antwortete mit HTTP ${res.status}`, {
          status: res.status,
          detail,
        });
        if (attempt < maxAttempts && RETRYABLE_STATUS.has(res.status)) {
          lastError = err;
          console.warn(
            `[fit-man] Gemini HTTP ${res.status} – Versuch ${attempt}/${maxAttempts}, retry in ${backoffMs}ms`,
          );
          await sleep(backoffMs);
          continue;
        }
        throw err;
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        const err = new GeminiError('empty', 'Gemini lieferte keine Antwort.');
        if (attempt < maxAttempts) {
          lastError = err;
          console.warn(`[fit-man] Gemini leere Antwort – Versuch ${attempt}/${maxAttempts}, retry`);
          await sleep(backoffMs);
          continue;
        }
        throw err;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        // Kein Retry: bei validem responseSchema wäre ein Parse-Fehler stabil.
        throw new GeminiError('parse', 'Gemini-Antwort war kein gültiges JSON.');
      }
    } catch (err) {
      const isTimeout =
        (err as Error)?.name === 'AbortError' ||
        (err instanceof Error && err.message === 'Aborted');
      if (isTimeout) {
        const e = new GeminiError(
          'timeout',
          `Gemini hat die ${timeoutMs}-ms-Grenze überschritten (Versuch ${attempt}/${maxAttempts}).`,
        );
        if (attempt < maxAttempts) {
          lastError = e;
          console.warn(
            `[fit-man] Gemini Timeout (${timeoutMs}ms) – Versuch ${attempt}/${maxAttempts}, retry in ${backoffMs}ms`,
          );
          await sleep(backoffMs);
          continue;
        }
        throw e;
      }
      if (err instanceof GeminiError) throw err; // http/empty/parse im Endzustand
      // Netzwerkfehler (Socket abgebrochen o. Ä.) – transient, ggf. neu versuchen.
      console.error('[fit-man] Gemini fetch fehlgeschlagen', err);
      if (attempt < maxAttempts) {
        console.warn(`[fit-man] Gemini Netzwerkfehler – Versuch ${attempt}/${maxAttempts}, retry`);
        await sleep(backoffMs);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // Nur erreichbar, wenn alle Versuche transient scheiterten.
  throw lastError ?? new GeminiError('timeout', 'Gemini-Aufruf fehlgeschlagen.');
}

// ---------------------------------------------------------------------------
// Gemeinsame Fehleraufbereitung für alle KI-Features
// ---------------------------------------------------------------------------

/** GeminiError -> stabiler Schlüssel für Query-Params und JSON-Antworten. */
export function geminiErrorKey(e: GeminiError): string {
  switch (e.code) {
    case 'missing-key':
      return 'key';
    case 'timeout':
      return 'timeout';
    case 'empty':
      return 'empty';
    case 'parse':
      return 'invalid';
    case 'http':
      return 'http';
  }
}

/**
 * Deutsche Texte je Fehlerschlüssel. Features ergänzen eigene Schlüssel per
 * Spread, z. B. `{ ...GEMINI_ERROR_TEXTS, prompt: '…' }`.
 */
export const GEMINI_ERROR_TEXTS: Record<string, string> = {
  empty: 'Der KI-Dienst hat keine Antwort geliefert. Bitte versuche es erneut.',
  invalid: 'Die Antwort war nicht verwertbar. Bitte versuche es erneut.',
  key: 'Der KI-Schlüssel ist nicht eingerichtet.',
  timeout: 'Der KI-Dienst hat zu lange gebraucht. Bitte erneut versuchen.',
  http: 'Der KI-Dienst ist gerade nicht erreichbar. Bitte später erneut versuchen.',
};
