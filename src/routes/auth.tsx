import { Hono, type Context } from 'hono';
import type { FC, PropsWithChildren } from 'hono/jsx';
import { and, eq, ne } from 'drizzle-orm';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createDb, type DB } from '../db';
import { sessions, users } from '../db/schema';
import {
  clearLoginFailures,
  createSession,
  createSessionToken,
  deleteSession,
  emailError,
  hashPassword,
  hashSessionToken,
  loginAttemptsExceeded,
  normalizeEmail,
  passwordError,
  pbkdf2Iterations,
  recordLoginFailure,
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  verifyPassword,
} from '../lib/auth';
import { requireUserId } from '../middleware/auth';
import { Layout, PageHeader } from '../components/layout';
import { Icon } from '../components/icons';
import { formatDateShort, newId } from '../lib/format';
import type { AppEnv, SessionUser } from '../types';

const app = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// Geteilte Bausteine
// ---------------------------------------------------------------------------

/** Fehlermeldung im Formular-Stil der übrigen App (vgl. GenerateForm). */
const FormError = ({ message }: { message: string }) => (
  <p class="card flex items-start gap-2 !p-3 text-sm text-red-400">
    <Icon name="x" size={16} class="mt-0.5 shrink-0" />
    <span>{message}</span>
  </p>
);

const SuccessNote = ({ message }: { message: string }) => (
  <p class="card flex items-start gap-2 !p-3 text-sm text-done">
    <Icon name="check" size={16} class="mt-0.5 shrink-0" />
    <span>{message}</span>
  </p>
);

/** Zentrierte Auth-Seite ohne Navigation (bare = auch ohne Bottom-Padding). */
const AuthShell: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <Layout title={title} bare>
    <div class="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div class="mx-auto w-full max-w-sm">
        <div class="mb-8 flex flex-col items-center gap-3 text-center">
          <div class="grid size-14 place-items-center rounded-2xl bg-accent text-white">
            <Icon name="dumbbell" size={26} />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight">FitMan</h1>
            <p class="text-sm text-muted">{title}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  </Layout>
);

// Kovertyp für die Props der Formulare (hono/jsx FC-Annotation unten).
type FormProps = { error?: string; success?: string; email?: string };

/** Startet eine Session und setzt das Login-Cookie. */
async function startSession(c: Context<AppEnv>, db: DB, userId: string): Promise<Response> {
  const { token, tokenHash } = await createSessionToken();
  await createSession(db, tokenHash, userId);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  });
  return c.redirect('/', 303);
}

// ---------------------------------------------------------------------------
// Login (/login)
// ---------------------------------------------------------------------------

const LoginForm: FC<FormProps> = ({ error, email }) => (
  <AuthShell title="Anmelden">
    {error ? <div class="mb-4"><FormError message={error} /></div> : null}
    <form method="post" action="/login" class="flex flex-col gap-4">
      <div>
        <label class="label" for="email">
          E-Mail
        </label>
        <input
          class="input"
          id="email"
          name="email"
          type="email"
          inputmode="email"
          required
          autocomplete="email"
          value={email ?? ''}
        />
      </div>
      <div>
        <label class="label" for="password">
          Passwort
        </label>
        <input
          class="input"
          id="password"
          name="password"
          type="password"
          required
          autocomplete="current-password"
        />
      </div>
      <button type="submit" class="btn-primary w-full">
        Anmelden
      </button>
    </form>
    <p class="mt-6 text-center text-sm text-muted">
      Noch kein Konto?{' '}
      <a href="/registrieren" class="font-semibold text-accent">
        Registrieren
      </a>
    </p>
  </AuthShell>
);

app.get('/login', (c) => {
  if (c.get('user')) return c.redirect('/', 303);
  return c.html(<LoginForm />);
});

app.post('/login', async (c) => {
  const db = createDb(c.env.DB);
  const form = await c.req.formData();
  const email = normalizeEmail(String(form.get('email') ?? ''));
  const password = String(form.get('password') ?? '');

  const invalidEmail = emailError(email);
  if (invalidEmail || !password) {
    return c.html(
      <LoginForm
        error={invalidEmail ?? 'Bitte gib E-Mail und Passwort ein.'}
        email={email}
      />,
    );
  }

  // Throttle zuerst – zählt auch bei unbekannter E-Mail, damit die Meldung
  // nicht verrät, ob ein Konto existiert.
  if (await loginAttemptsExceeded(db, email)) {
    return c.html(
      <LoginForm
        error="Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen."
        email={email}
      />,
    );
  }

  const [account] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const iterations = pbkdf2Iterations(c.env.PBKDF2_ITERATIONS);
  const result = account
    ? await verifyPassword(password, account.passwordHash, iterations)
    : { ok: false, needsRehash: false };

  if (!account || !result.ok) {
    await recordLoginFailure(db, email);
    return c.html(<LoginForm error="E-Mail oder Passwort ist falsch." email={email} />);
  }

  await clearLoginFailures(db, email);

  // Aufgeräumt: älteren (schwächeren) Hash beim Login auf die aktuell
  // konfigurierte Iterationszahl heben.
  if (result.needsRehash) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password, iterations) })
      .where(eq(users.id, account.id));
  }

  return startSession(c, db, account.id);
});

// ---------------------------------------------------------------------------
// Registrierung (/registrieren) – offen für alle
// ---------------------------------------------------------------------------

const RegisterForm: FC<FormProps> = ({ error, email }) => (
  <AuthShell title="Registrieren">
    {error ? <div class="mb-4"><FormError message={error} /></div> : null}
    <form method="post" action="/registrieren" class="flex flex-col gap-4">
      <div>
        <label class="label" for="email">
          E-Mail
        </label>
        <input
          class="input"
          id="email"
          name="email"
          type="email"
          inputmode="email"
          required
          autocomplete="email"
          value={email ?? ''}
        />
      </div>
      <div>
        <label class="label" for="password">
          Passwort
        </label>
        <input
          class="input"
          id="password"
          name="password"
          type="password"
          required
          minlength={8}
          autocomplete="new-password"
        />
        <p class="mt-1 text-xs text-muted">Mindestens 8 Zeichen.</p>
      </div>
      <div>
        <label class="label" for="confirm">
          Passwort wiederholen
        </label>
        <input
          class="input"
          id="confirm"
          name="confirm"
          type="password"
          required
          minlength={8}
          autocomplete="new-password"
        />
      </div>
      <button type="submit" class="btn-primary w-full">
        Konto erstellen
      </button>
    </form>
    <p class="mt-6 text-center text-sm text-muted">
      Schon registriert?{' '}
      <a href="/login" class="font-semibold text-accent">
        Anmelden
      </a>
    </p>
  </AuthShell>
);

app.get('/registrieren', (c) => {
  if (c.get('user')) return c.redirect('/', 303);
  return c.html(<RegisterForm />);
});

app.post('/registrieren', async (c) => {
  const db = createDb(c.env.DB);
  const form = await c.req.formData();
  const email = normalizeEmail(String(form.get('email') ?? ''));
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');

  const invalidEmail = emailError(email);
  if (invalidEmail) return c.html(<RegisterForm error={invalidEmail} email={email} />);

  const invalidPassword = passwordError(password);
  if (invalidPassword) return c.html(<RegisterForm error={invalidPassword} email={email} />);

  if (password !== confirm) {
    return c.html(<RegisterForm error="Die Passwörter stimmen nicht überein." email={email} />);
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return c.html(
      <RegisterForm error="Diese E-Mail ist bereits registriert." email={email} />,
    );
  }

  const id = newId('usr');
  const passwordHash = await hashPassword(password, pbkdf2Iterations(c.env.PBKDF2_ITERATIONS));
  try {
    await db.insert(users).values({ id, email, passwordHash });
  } catch {
    // Unique-Verstoß durch parallele Registrierung derselben E-Mail.
    return c.html(
      <RegisterForm error="Diese E-Mail ist bereits registriert." email={email} />,
    );
  }

  return startSession(c, db, id);
});

// ---------------------------------------------------------------------------
// Logout (/logout)
// ---------------------------------------------------------------------------

app.post('/logout', async (c) => {
  const db = createDb(c.env.DB);
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await deleteSession(db, await hashSessionToken(token));
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.redirect('/login', 303);
});

// ---------------------------------------------------------------------------
// Profil (/profil) – 4. Nav-Tab
// ---------------------------------------------------------------------------

type ProfilProps = {
  user: SessionUser;
  memberSince: string;
  error?: string;
  success?: string;
};

const ProfilPage: FC<ProfilProps> = ({ user, memberSince, error, success }) => (
  <Layout title="Profil" active="profile" user={user}>
    <PageHeader title="Profil" subtitle={user.email} />

    <div class="flex flex-col gap-4 px-4 py-4">
      {success ? <SuccessNote message={success} /> : null}
      {error ? <FormError message={error} /> : null}

      <section class="card flex items-center gap-3 !p-4">
        <div class="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Icon name="user" size={24} />
        </div>
        <div class="min-w-0">
          <p class="truncate font-semibold">{user.email}</p>
          <p class="text-xs text-muted">Mitglied seit {memberSince}</p>
        </div>
      </section>

      <section class="card flex flex-col gap-3 !p-4">
        <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Passwort ändern</h2>
        <form method="post" action="/profil/passwort" class="flex flex-col gap-3">
          <div>
            <label class="label" for="current">
              Aktuelles Passwort
            </label>
            <input
              class="input"
              id="current"
              name="current"
              type="password"
              required
              autocomplete="current-password"
            />
          </div>
          <div>
            <label class="label" for="next">
              Neues Passwort
            </label>
            <input
              class="input"
              id="next"
              name="next"
              type="password"
              required
              minlength={8}
              autocomplete="new-password"
            />
          </div>
          <div>
            <label class="label" for="confirm">
              Neues Passwort wiederholen
            </label>
            <input
              class="input"
              id="confirm"
              name="confirm"
              type="password"
              required
              minlength={8}
              autocomplete="new-password"
            />
          </div>
          <button type="submit" class="btn-secondary w-full">
            Passwort speichern
          </button>
        </form>
        <p class="text-xs text-muted">
          Aus Sicherheitsgründen wirst du auf anderen Geräten abgemeldet.
        </p>
      </section>

      <form method="post" action="/logout" class="pt-2">
        <button type="submit" class="btn-danger w-full">
          <Icon name="logOut" size={18} />
          Abmelden
        </button>
      </form>
    </div>
  </Layout>
);

app.get('/profil', async (c) => {
  const userId = requireUserId(c);
  const db = createDb(c.env.DB);

  const [account] = await db
    .select({ email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!account) return c.redirect('/login', 303); // Session auf gelöschtem Konto

  const flash = c.req.query('pw');
  const success = flash === 'ok' ? 'Passwort geändert.' : undefined;

  return c.html(
    <ProfilPage
      user={c.get('user')!}
      memberSince={formatDateShort(account.createdAt)}
      success={success}
    />,
  );
});

app.post('/profil/passwort', async (c) => {
  const userId = requireUserId(c);
  const db = createDb(c.env.DB);
  const user = c.get('user')!;

  const form = await c.req.formData();
  const current = String(form.get('current') ?? '');
  const next = String(form.get('next') ?? '');
  const confirm = String(form.get('confirm') ?? '');

  const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!account) return c.redirect('/login', 303);

  const iterations = pbkdf2Iterations(c.env.PBKDF2_ITERATIONS);
  const currentOk = (await verifyPassword(current, account.passwordHash, iterations)).ok;
  if (!currentOk) {
    return c.html(
      <ProfilPage user={user} memberSince={formatDateShort(account.createdAt)} error="Das aktuelle Passwort ist falsch." />,
    );
  }

  const invalidPassword = passwordError(next);
  if (invalidPassword) {
    return c.html(
      <ProfilPage user={user} memberSince={formatDateShort(account.createdAt)} error={invalidPassword} />,
    );
  }
  if (next !== confirm) {
    return c.html(
      <ProfilPage
        user={user}
        memberSince={formatDateShort(account.createdAt)}
        error="Die neuen Passwörter stimmen nicht überein."
      />,
    );
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next, iterations) })
    .where(eq(users.id, userId));

  // Alle anderen Sessions invalidieren – nur dieses Gerät bleibt eingeloggt.
  const token = getCookie(c, SESSION_COOKIE);
  const keepHash = token ? await hashSessionToken(token) : '';
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, keepHash)));

  return c.redirect('/profil?pw=ok', 303);
});

export default app;
