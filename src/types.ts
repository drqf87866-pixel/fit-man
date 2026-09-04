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
};

export type AppEnv = { Bindings: Bindings };
