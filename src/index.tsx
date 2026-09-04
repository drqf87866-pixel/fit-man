import { Hono } from 'hono';
import auth from './routes/auth';
import plans from './routes/plans';
import exercises from './routes/exercises';
import workout from './routes/workout';
import history from './routes/history';
import { csrfOriginCheck, sessionMiddleware, requireAuth } from './middleware/auth';
import { Layout, PageHeader } from './components/layout';
import { Icon } from './components/icons';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

// Statische Assets (/styles.css, /app.js, /manifest.webmanifest, /icon.svg)
// werden bereits vom Assets-Handler vor dem Worker ausgeliefert.
//
// Die Middleware-Reihenfolge ist kritisch: Hono führt registrierte Handler in
// Registrierungsreihenfolge aus, also MUSS alles app.use(...) vor den
// app.route(...)-Mounts stehen.
app.use('*', csrfOriginCheck);
app.use('*', sessionMiddleware);
app.use('*', requireAuth);

app.route('/', auth);
app.route('/', plans);
app.route('/', exercises);
app.route('/', workout);
app.route('/', history);

app.get('/healthz', (c) => c.json({ ok: true }));

app.notFound((c) =>
  c.html(
    <Layout title="Nicht gefunden" active={null} user={c.get('user')}>
      <PageHeader title="Nicht gefunden" back="/" />
      <div class="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div class="grid size-16 place-items-center rounded-2xl border border-border bg-surface text-muted">
          <Icon name="search" size={28} />
        </div>
        <p class="text-muted">Diese Seite gibt es nicht (mehr).</p>
        <a href="/" class="btn-primary">
          Zum Training
        </a>
      </div>
    </Layout>,
    404,
  ),
);

app.onError((err, c) => {
  console.error('[fit-man]', err);
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Interner Fehler' }, 500);
  }
  return c.html(
    <Layout title="Fehler" active={null} user={c.get('user')}>
      <PageHeader title="Fehler" back="/" />
      <div class="px-6 py-16 text-center">
        <p class="mb-4 text-muted">Da ist etwas schiefgelaufen.</p>
        <a href="/" class="btn-primary">
          Neu laden
        </a>
      </div>
    </Layout>,
    500,
  );
});

export default app;
