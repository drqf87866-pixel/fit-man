/** Cloudflare-Bindings aus wrangler.toml */
export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Worker-Secret (GEMINI_API_KEY), NIE als [vars] in wrangler.toml */
  GEMINI_API_KEY: string;
  /** Optionales Modell, Default "gemini-3.1-flash-lite" (als [vars]) */
  GEMINI_MODEL?: string;
};

export type AppEnv = { Bindings: Bindings };
