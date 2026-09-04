/**
 * Auth-Kern: Passwort-Hashing, Session-Tokens, Login-Throttle.
 *
 * Bewusst frei von Hono – reine Funktionen auf WebCrypto und D1, gleicher
 * Stil wie lib/ai-quota.ts. Das Hono-Glue (Middleware, Cookies) liegt in
 * src/middleware/auth.ts, die Seiten in src/routes/auth.tsx.
 *
 * Warum PBKDF2 und kein bcrypt/scrypt? Der Worker hat kein natives bcrypt,
 * aber WebCrypto-PBKDF2 läuft in nativem Code – die einzige Option, die auf
 * CPU-Limits verzichtet. Das Hash-Format ist selbstbeschreibend
 * (`pbkdf2$<iterations>$<salt_b64>$<hash_b64>`): jede Hash-Zeile trägt ihre
 * eigene Iterationszahl, damit der Wert später erhöht werden kann, ohne
 * bestehende Konten zu brechen (Rehash beim erfolgreichen Login).
 *
 * CPU-Falle: Der Workers-Free-Plan erlaubt 10 ms CPU pro Request. 100.000
 * PBKDF2-Iterationen sprengen das – deshalb liegt die Iterationszahl in
 * [vars] (PBKDF2_ITERATIONS) und steht im Deployment auf 25.000. Nur
 * Registrierung/Login/Passwortwechsel zahlen diesen Preis; Session-Requests
 * machen kein PBKDF2.
 */

import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { loginAttempts, sessions, users } from '../db/schema';
import type { DB } from '../db';

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

/** Code-Default für den Fall, dass PBKDF2_ITERATIONS nicht gesetzt ist. */
export const PBKDF2_DEFAULT_ITERATIONS = 100_000;

/** Session-Dauer: 30 Tage, rolling (unter 15 Tagen Restlauf wird verlängert). */
export const SESSION_TTL_SEC = 30 * 24 * 60 * 60;
export const SESSION_REFRESH_THRESHOLD_SEC = 15 * 24 * 60 * 60;

/** Login-Throttle: 5 Fehlversuche je E-Mail binnen 15 Minuten. */
export const LOGIN_WINDOW_SEC = 15 * 60;
export const LOGIN_MAX_FAILURES = 5;

export const SESSION_COOKIE = 'fitman_session';

/** Liest PBKDF2_ITERATIONS aus der Umgebung und hält sie in sinnvollen Grenzen. */
export function pbkdf2Iterations(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return PBKDF2_DEFAULT_ITERATIONS;
  return Math.min(1_000_000, Math.max(10_000, Math.round(n)));
}

// ---------------------------------------------------------------------------
// E-Mail & Passwort-Validierung (deutsche Fehlermeldungen für die Formulare)
// ---------------------------------------------------------------------------

/** trim + lowercase – E-Mails sind in der DB immer normalisiert gespeichert. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** null = gültig, sonst deutsche Fehlermeldung. */
export function emailError(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (!email) return 'Bitte gib eine E-Mail-Adresse ein.';
  if (email.length > 254) return 'Diese E-Mail-Adresse ist zu lang.';
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1) return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  return null;
}

/** null = gültig, sonst deutsche Fehlermeldung. */
export function passwordError(password: string): string | null {
  if (password.length < 8) return 'Das Passwort muss mindestens 8 Zeichen lang sein.';
  if (password.length > 200) return 'Das Passwort ist zu lang.';
  return null;
}

// ---------------------------------------------------------------------------
// Passwort-Hashing (PBKDF2-SHA256 via WebCrypto)
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const buf = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return new Uint8Array(buf);
}

/** Erzeugt einen Hash-String der Form pbkdf2$<iterations>$<salt_b64>$<hash_b64>. */
export async function hashPassword(password: string, iterations: number): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt, iterations);
  return `pbkdf2$${iterations}$${toB64(salt)}$${toB64(bits)}`;
}

export type VerifyResult = {
  ok: boolean;
  /** true = gültiges Passwort, aber schwächer gehasht als aktuell konfiguriert. */
  needsRehash: boolean;
};

/**
 * Prüft ein Passwort gegen einen gespeicherten Hash. Defensiv gegen kaputte
 * Formate (liefert dann ok:false statt zu werfen). Der Vergleich läuft in
 * konstanter Zeit (XOR-Schleife), damit Timing-Oracles keine Chance haben.
 */
export async function verifyPassword(
  password: string,
  stored: string,
  currentIterations: number,
): Promise<VerifyResult> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return { ok: false, needsRehash: false };

  const iterations = Number(parts[1]);
  const salt = fromB64(parts[2]);
  const expected = fromB64(parts[3]);
  if (!Number.isInteger(iterations) || iterations < 1) return { ok: false, needsRehash: false };
  if (salt.length < 8 || expected.length < 16) return { ok: false, needsRehash: false };

  const actual = await deriveBits(password, salt, iterations);
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= (actual[i] ?? 0) ^ (expected[i] ?? 0);
  const ok = diff === 0 && actual.length === expected.length;
  return { ok, needsRehash: ok && iterations < currentIterations };
}

// ---------------------------------------------------------------------------
// Session-Tokens: 32 Zufallsbytes, nur der SHA-256-Hash landet in der DB
// ---------------------------------------------------------------------------

/** SHA-256-Hex eines Cookie-Tokens – identische Funktion für Middleware & Logout. */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSessionToken(): Promise<{ token: string; tokenHash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  const token = btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { token, tokenHash: await hashSessionToken(token) };
}

// ---------------------------------------------------------------------------
// Session-CRUD
// ---------------------------------------------------------------------------

export async function createSession(
  db: DB,
  tokenHash: string,
  userId: string,
  now = new Date(),
): Promise<void> {
  await db.insert(sessions).values({
    tokenHash,
    userId,
    expiresAt: new Date(now.getTime() + SESSION_TTL_SEC * 1000),
    createdAt: now,
  });
}

export type SessionRow = { userId: string; email: string; expiresAt: Date };

export async function findSession(db: DB, tokenHash: string, now = new Date()): Promise<SessionRow | null> {
  const [row] = await db
    .select({ userId: users.id, email: users.email, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);
  return row ?? null;
}

export function deleteSession(db: DB, tokenHash: string): Promise<unknown> {
  return db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/** Rolling Expiry: verlängert auf die volle TTL. */
export async function extendSession(db: DB, tokenHash: string, now = new Date()): Promise<void> {
  await db
    .update(sessions)
    .set({ expiresAt: new Date(now.getTime() + SESSION_TTL_SEC * 1000) })
    .where(eq(sessions.tokenHash, tokenHash));
}

/** Gelegentliches Aufräumen abgelaufener Sessions – über waitUntil aus der Middleware. */
export function deleteExpiredSessions(db: DB, now = new Date()): Promise<unknown> {
  return db.delete(sessions).where(lt(sessions.expiresAt, now));
}

// ---------------------------------------------------------------------------
// Login-Throttle: Fixed Window je E-Mail, atomarer Upsert
// ---------------------------------------------------------------------------

/** Zählt der Zähler aktuell bereits als gesperrt? */
export async function loginAttemptsExceeded(
  db: DB,
  email: string,
  now = new Date(),
): Promise<boolean> {
  const [row] = await db
    .select({ windowStart: loginAttempts.windowStart, count: loginAttempts.count })
    .from(loginAttempts)
    .where(eq(loginAttempts.email, email))
    .limit(1);
  if (!row) return false;
  const windowStartSec = Math.floor(now.getTime() / 1000) - LOGIN_WINDOW_SEC;
  if (row.windowStart <= windowStartSec) return false; // Fenster abgelaufen
  return row.count >= LOGIN_MAX_FAILURES;
}

/**
 * Ein Fehlversuch mehr – in einer Anweisung, damit parallele Requests nicht
 * gemeinsam am Limit vorbeizählen. Abgelaufene Fenster starten bei 1 neu.
 */
export async function recordLoginFailure(db: DB, email: string, now = new Date()): Promise<void> {
  const nowSec = Math.floor(now.getTime() / 1000);
  const windowStartSec = nowSec - LOGIN_WINDOW_SEC;
  await db.run(sql`
    INSERT INTO login_attempts (email, window_start, count)
    VALUES (${email}, ${nowSec}, 1)
    ON CONFLICT(email) DO UPDATE SET
      count = CASE WHEN window_start <= ${windowStartSec} THEN 1 ELSE count + 1 END
  `);
}

/** Nach erfolgreichem Login den Zähler verwerfen. */
export function clearLoginFailures(db: DB, email: string): Promise<unknown> {
  return db.delete(loginAttempts).where(eq(loginAttempts.email, email));
}
