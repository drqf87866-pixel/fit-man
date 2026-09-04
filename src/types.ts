/** Der in der Session gespeicherte Nutzer – in Handlers via requireUserId(c). */
export type SessionUser = { id: string; email: string };

/** Cloudflare-Bindings aus wrangler.toml */
export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Worker-Secret (GEMINI_API_KEY), NIE als [vars] in wrangler.toml */
  GEMINI_API_KEY: string;
  /** Optionales Modell, Default "gemini-3.1-flash-lite" (als [vars]) */
  GEMINI_MODEL?: string;
  /** Max. Gemini-Anfragen pro Minute (als [vars]); Default 14, hart auf 15 gedeckelt */
  GEMINI_RPM?: string;
  /** PBKDF2-Iterationen für Passwort-Hashes (als [vars]); Default 100.000.
   *  Free-Plan-Deployments setzen 25.000 wegen des 10-ms-CPU-Limits. */
  PBKDF2_ITERATIONS?: string;
  /** KI-Anfragen je Nutzer und Tag (als [vars]); Default 50 */
  AI_DAILY_LIMIT?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  /** Von der Auth-Middleware belegt (sessionMiddleware) */
  Variables: { user: SessionUser | null };
};
