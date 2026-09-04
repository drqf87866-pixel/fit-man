/**
 * Hono-Glue für die Authentifizierung: Session laden, Zugriffe schützen,
 * CSRF absichern. Die reine Logik (Hashing, Tokens, Throttle) liegt in
 * src/lib/auth.ts – hier nur Context, Cookies und Redirects.
 *
 * Reihenfolge in src/index.tsx ist kritisch (Hono führt registrierte Handler
 * in Registrierungsreihenfolge aus):
 *   csrfOriginCheck -> sessionMiddleware -> requireAuth -> app.route(...)
 */

import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { createDb } from '../db';
import type { AppEnv, SessionUser } from '../types';
import {
  createSessionToken,
  deleteExpiredSessions,
  deleteSession,
  extendSession,
  findSession,
  hashSessionToken,
  SESSION_COOKIE,
  SESSION_REFRESH_THRESHOLD_SEC,
  SESSION_TTL_SEC,
} from '../lib/auth';

/** Seiten, die ohne Login erreichbar sind (exakter Pfad-Vergleich). */
export const PUBLIC_PATHS = new Set(['/login', '/registrieren', '/healthz']);

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF, Ebene 2: Bei unsicheren Methoden muss der Origin-Header (Fallback
 * Referer) zum Request-Origin passen. Ebene 1 ist SameSite=Lax am Cookie.
 * Fehlen beide Header, handelt es sich um einen Nicht-Browser-Client, der
 * ohnehin keine Cookies hält – erlaubt.
 */
export const csrfOriginCheck = createMiddleware<AppEnv>(async (c, next) => {
  if (!UNSAFE_METHODS.has(c.req.method)) return next();

  const requestOrigin = new URL(c.req.url).origin;
  const headerOrigin = c.req.header('Origin') ?? originFromReferer(c.req.header('Referer'));
  if (!headerOrigin) return next();
  if (headerOrigin === requestOrigin) return next();

  return c.text('Anfrage abgelehnt: Herkunft nicht zulässig.', 403);
});

function originFromReferer(referer?: string): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Lädt die Session aus dem Cookie in den Context (c.set('user', …)) – oder
 * setzt sie auf null. Fehler werden abgefangen und schließen zu (fail closed).
 * Rolling Expiry: kurz vor Ablauf wird auf die volle TTL verlängert und das
 * Cookie erneuert. Abgelaufene Sessions werden mit 1-%iger Chance aufgeräumt.
 */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('user', null);

  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    try {
      const db = createDb(c.env.DB);
      const tokenHash = await hashSessionToken(token);
      const row = await findSession(db, tokenHash);
      if (row) {
        const user: SessionUser = { id: row.userId, email: row.email };
        c.set('user', user);

        const remainingSec = Math.floor(row.expiresAt.getTime() / 1000) - Math.floor(Date.now() / 1000);
        if (remainingSec < SESSION_REFRESH_THRESHOLD_SEC) {
          await extendSession(db, tokenHash);
          setCookie(c, SESSION_COOKIE, token, {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            path: '/',
            maxAge: SESSION_TTL_SEC,
          });
        }

        if (Math.random() < 0.01) c.executionCtx.waitUntil(deleteExpiredSessions(db));
      }
    } catch (err) {
      console.error('[fit-man] sessionMiddleware', err);
      c.set('user', null);
    }
  }

  await next();
});

/**
 * Schützt alle nicht-öffentlichen Routen: HTML-Seiten bekommen 303 -> /login,
 * JSON-APIs einen 401. STATIC Assets erreichen den Worker gar nicht (der
 * Assets-Handler liefert vorher aus).
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (PUBLIC_PATHS.has(c.req.path)) return next();
  if (c.get('user')) return next();

  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Nicht angemeldet.' }, 401);
  }
  return c.redirect('/login', 303);
});

/** Für Handler nach requireAuth – garantiert vorhanden, sonst Bug im Routing. */
export function requireUserId(c: { get: (key: 'user') => SessionUser | null }): string {
  const user = c.get('user');
  if (!user) throw new HTTPException(401, { message: 'Nicht angemeldet.' });
  return user.id;
}
