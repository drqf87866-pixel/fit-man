import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb } from '../db';
import { setLogs, workoutLogs, workoutPlans } from '../db/schema';
import { getPlanExercises, getPreviousSets, listExercises } from '../lib/queries';
import { newId } from '../lib/format';
import { Layout } from '../components/layout';
import { Icon } from '../components/icons';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// Screen 2: Aktives Workout  (/workout/active)
//
// Die Seite wird als Shell gerendert; den interaktiven Teil (Sätze, Rest-Timer,
// Übungswechsel) übernimmt public/app.js. Der laufende Zustand liegt im
// localStorage, damit ein Sperrbildschirm oder Reload im Gym nichts kostet.
// Gespeichert wird erst am Ende – transaktional als ein D1-Batch.
// ---------------------------------------------------------------------------
app.get('/workout/active', async (c) => {
  const db = createDb(c.env.DB);
  const planId = c.req.query('plan') ?? null;

  const [plan] = planId
    ? await db.select().from(workoutPlans).where(eq(workoutPlans.id, planId)).limit(1)
    : [];

  const [planItems, allExercises, previous] = await Promise.all([
    plan ? getPlanExercises(db, plan.id) : Promise.resolve([]),
    listExercises(db),
    getPreviousSets(db),
  ]);

  const payload = {
    planId: plan?.id ?? null,
    planName: plan?.name ?? 'Freies Training',
    exercises: planItems.map((it) => ({
      exerciseId: it.exerciseId,
      name: it.name,
      category: it.category,
      targetMuscle: it.targetMuscle,
      movement: it.movement,
      equipment: it.equipment,
      targetSets: it.targetSets,
    })),
    library: allExercises.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      targetMuscle: e.targetMuscle,
      movement: e.movement,
      equipment: e.equipment,
    })),
    previous,
  };

  return c.html(
    <Layout title={payload.planName} bare>
      <div id="workout-root" class="min-h-dvh"></div>

      <script
        type="application/json"
        id="workout-payload"
        // JSON in <script type="application/json"> ist kein JS-Kontext; nur das
        // Sequenz-Ende </script> muss neutralisiert werden.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(payload).replace(/</g, '\\u003c'),
        }}
      ></script>

      <noscript>
        <div class="p-6 text-center">
          <p class="mb-4 font-semibold">Der Workout-Tracker benötigt JavaScript.</p>
          <a href="/" class="btn-secondary">
            <Icon name="arrowLeft" size={18} />
            Zurück
          </a>
        </div>
      </noscript>
    </Layout>,
  );
});

// ---------------------------------------------------------------------------
// API: Workout transaktional speichern
// ---------------------------------------------------------------------------
type IncomingSet = {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  completed: boolean;
};

type IncomingWorkout = {
  planId?: string | null;
  planName?: string;
  date?: number;
  durationSeconds?: number;
  notes?: string;
  sets?: IncomingSet[];
};

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

app.post('/api/workouts', async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<IncomingWorkout>().catch(() => null);

  if (!body || !Array.isArray(body.sets) || body.sets.length === 0) {
    return c.json({ error: 'Keine Sätze übermittelt.' }, 400);
  }

  // Nur Übungen, die es wirklich gibt – schützt vor FK-Fehlern im Batch.
  const known = new Set((await listExercises(db)).map((e) => e.id));
  const sets = body.sets.filter((s) => known.has(s.exerciseId));
  if (sets.length === 0) return c.json({ error: 'Keine gültigen Sätze.' }, 400);

  let planId = body.planId ?? null;
  if (planId) {
    const [plan] = await db.select().from(workoutPlans).where(eq(workoutPlans.id, planId)).limit(1);
    if (!plan) planId = null;
  }

  const workoutId = newId('wl');
  const statements = [
    db.insert(workoutLogs).values({
      id: workoutId,
      planId,
      planName: String(body.planName ?? 'Freies Training').slice(0, 80),
      date: new Date(num(body.date, Date.now())),
      durationSeconds: Math.max(0, Math.round(num(body.durationSeconds))),
      notes: String(body.notes ?? '').slice(0, 1000),
    }),
    ...sets.map((s) =>
      db.insert(setLogs).values({
        id: newId('sl'),
        workoutLogId: workoutId,
        exerciseId: s.exerciseId,
        setNumber: Math.max(1, Math.round(num(s.setNumber, 1))),
        reps: Math.max(0, Math.round(num(s.reps))),
        weightKg: Math.max(0, Math.round(num(s.weightKg) * 100) / 100),
        completed: Boolean(s.completed),
      }),
    ),
  ];

  // D1 batch führt alle Statements in einer impliziten Transaktion aus:
  // entweder landet das komplette Workout in D1 oder gar nichts.
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);

  return c.json({ id: workoutId, url: `/history/${workoutId}` }, 201);
});

export default app;
