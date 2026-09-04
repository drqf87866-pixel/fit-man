import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb } from '../db';
import { planExercises, workoutPlans } from '../db/schema';
import { getPlanExercises, listExercises, listPlans, type PlanListRow } from '../lib/queries';
import { formatRelative, newId } from '../lib/format';
import { CategoryBadge, EmptyState, Layout, PageHeader } from '../components/layout';
import { TagBadges } from '../components/tags';
import { MOVEMENT_LABELS, EQUIPMENT_LABELS } from '../lib/tags';
import { ExerciseFilters } from '../components/filters';
import { Icon } from '../components/icons';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// Screen 1: Trainingspläne & Start  (/)
// ---------------------------------------------------------------------------
const PlanCard = ({ plan }: { plan: PlanListRow }) => (
  <li class="card flex flex-col gap-3">
    <a href={`/plans/${plan.id}`} class="min-w-0">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="truncate text-lg font-bold">{plan.name}</h2>
          {plan.description ? (
            <p class="mt-0.5 line-clamp-2 text-sm text-muted">{plan.description}</p>
          ) : null}
        </div>
        <Icon name="chevronRight" size={20} class="mt-1 text-muted" />
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span class="inline-flex items-center gap-1">
          <Icon name="layers" size={14} />
          {plan.exercise_count} {plan.exercise_count === 1 ? 'Übung' : 'Übungen'}
        </span>
        {plan.last_done ? (
          <span class="inline-flex items-center gap-1">
            <Icon name="history" size={14} />
            zuletzt {formatRelative(new Date(plan.last_done * 1000))}
          </span>
        ) : (
          <span class="text-accent">noch nie trainiert</span>
        )}
      </div>
    </a>
    <a href={`/workout/active?plan=${plan.id}`} class="btn-primary w-full">
      <Icon name="play" size={18} />
      Training starten
    </a>
  </li>
);

app.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const plans = await listPlans(db);

  return c.html(
    <Layout title="Training" active="training">
      <PageHeader title="Training" subtitle="Pläne & Schnellstart">
        <a href="/plans/new" class="btn-secondary !px-3" aria-label="Neuen Plan erstellen">
          <Icon name="plus" size={20} />
        </a>
      </PageHeader>

      <div class="px-4 py-4">
        <a
          href="/workout/active?quick=1"
          class="flex touch items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 active:scale-[0.99]"
        >
          <div class="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-white">
            <Icon name="zap" size={22} />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-bold">Freies Training</p>
            <p class="text-sm text-muted">Ohne Plan starten, Übungen unterwegs wählen</p>
          </div>
          <Icon name="chevronRight" size={20} class="text-accent" />
        </a>
      </div>

      <section class="px-4">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Deine Pläne</h2>
        {plans.length === 0 ? (
          <EmptyState
            icon="dumbbell"
            title="Noch kein Plan"
            text="Erstelle deinen ersten Trainingsplan oder starte direkt ein freies Training."
          />
        ) : (
          <ul class="flex flex-col gap-3">
            {plans.map((p) => (
              <PlanCard plan={p} />
            ))}
          </ul>
        )}

        <a href="/plans/new" class="btn-secondary mt-4 w-full">
          <Icon name="plus" size={20} />
          Neuen Plan erstellen
        </a>
      </section>
    </Layout>,
  );
});

// ---------------------------------------------------------------------------
// Neuen Plan erstellen
// ---------------------------------------------------------------------------
app.get('/plans/new', async (c) => {
  const db = createDb(c.env.DB);
  const all = await listExercises(db);
  const categories = [...new Set(all.map((e) => e.category))];

  return c.html(
    <Layout title="Neuer Plan" active="training">
      <PageHeader title="Neuer Plan" back="/" />
      <form method="post" action="/plans" class="flex flex-col gap-5 px-4 py-4" data-plan-form>
        <div>
          <label class="label" for="name">
            Name des Plans
          </label>
          <input
            class="input"
            id="name"
            name="name"
            required
            maxlength={60}
            placeholder="z. B. Push Day A"
            autocomplete="off"
          />
        </div>

        <div>
          <label class="label" for="description">
            Beschreibung (optional)
          </label>
          <textarea
            class="input py-2.5"
            id="description"
            name="description"
            rows={2}
            maxlength={200}
            placeholder="Fokus, Split-Tag, Notizen"
          ></textarea>
        </div>

        <div>
          <div class="mb-2 flex items-baseline justify-between">
            <span class="label mb-0">Übungen auswählen</span>
            <span class="text-sm font-semibold text-accent" data-plan-count>
              0 ausgewählt
            </span>
          </div>

          <div class="relative mb-3">
            <Icon
              name="search"
              size={18}
              class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            />
            <input
              class="input pl-10"
              type="search"
              placeholder="Übung suchen"
              data-plan-search
              autocomplete="off"
            />
          </div>

          <div class="mb-3" data-plan-filters>
            <ExerciseFilters categories={categories} />
          </div>

          <ul class="flex flex-col gap-2" data-plan-list>
            {all.map((ex) => (
              <li
                class="rounded-xl border border-border bg-surface"
                data-plan-item
                data-category={ex.category}
                data-movement={ex.movement}
                data-equipment={ex.equipment}
                data-name={`${ex.name} ${MOVEMENT_LABELS[ex.movement] ?? ''} ${EQUIPMENT_LABELS[ex.equipment] ?? ''}`.toLowerCase()}
              >
                <label class="flex touch cursor-pointer items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    name="exerciseId"
                    value={ex.id}
                    class="size-6 shrink-0 accent-[var(--color-accent)]"
                    data-plan-check
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-medium">{ex.name}</span>
                    <span class="block truncate text-xs text-muted">{ex.targetMuscle}</span>
                    <TagBadges movement={ex.movement} equipment={ex.equipment} />
                  </span>
                  <CategoryBadge category={ex.category} custom={ex.isCustom} />
                </label>
                <div
                  class="hidden items-center gap-2 border-t border-border px-3 py-2"
                  data-plan-sets
                >
                  <span class="text-sm text-muted">Sätze</span>
                  <div class="ml-auto flex items-center gap-1">
                    <button type="button" class="btn-secondary !min-w-11 !px-0" data-sets-dec>
                      <Icon name="minus" size={18} />
                    </button>
                    <input
                      type="number"
                      name={`targetSets_${ex.id}`}
                      value="3"
                      min="1"
                      max="20"
                      inputmode="numeric"
                      class="input w-16 text-center font-bold tabular-nums"
                      data-sets-input
                    />
                    <button type="button" class="btn-secondary !min-w-11 !px-0" data-sets-inc>
                      <Icon name="plus" size={18} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div class="sticky bottom-24 z-20">
          <button type="submit" class="btn-primary w-full shadow-xl">
            <Icon name="save" size={20} />
            Plan speichern
          </button>
        </div>
      </form>
    </Layout>,
  );
});

function clampSets(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? '3'), 10);
  if (!Number.isFinite(n)) return 3;
  return Math.min(20, Math.max(1, n));
}

app.post('/plans', async (c) => {
  const db = createDb(c.env.DB);
  const form = await c.req.formData();

  const name = String(form.get('name') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const exerciseIds = form.getAll('exerciseId').map(String);

  if (!name) return c.redirect('/plans/new', 303);

  const planId = newId('plan');
  const statements = [
    db.insert(workoutPlans).values({ id: planId, name, description, createdAt: new Date() }),
    ...exerciseIds.map((exerciseId, index) =>
      db.insert(planExercises).values({
        id: newId('pe'),
        planId,
        exerciseId,
        order: index,
        targetSets: clampSets(form.get(`targetSets_${exerciseId}`)),
      }),
    ),
  ];

  // D1 batch = eine implizite Transaktion: Plan + Übungen landen gemeinsam.
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
  return c.redirect(`/plans/${planId}`, 303);
});

// ---------------------------------------------------------------------------
// Plan-Detail
// ---------------------------------------------------------------------------
app.get('/plans/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [plan] = await db.select().from(workoutPlans).where(eq(workoutPlans.id, id)).limit(1);
  if (!plan) return c.notFound();

  const items = await getPlanExercises(db, id);

  return c.html(
    <Layout title={plan.name} active="training">
      <PageHeader title={plan.name} subtitle={plan.description || undefined} back="/" />

      <div class="px-4 py-4">
        <a href={`/workout/active?plan=${plan.id}`} class="btn-primary !h-14 w-full text-lg">
          <Icon name="play" size={22} />
          Training starten
        </a>
      </div>

      <section class="px-4">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
          Übungen ({items.length})
        </h2>
        {items.length === 0 ? (
          <p class="text-sm text-muted">Dieser Plan enthält noch keine Übungen.</p>
        ) : (
          <ol class="flex flex-col gap-2">
            {items.map((it, i) => (
              <li class="card flex items-center gap-3 !p-3">
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-bold text-muted tabular-nums">
                  {i + 1}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{it.name}</span>
                  <span class="block truncate text-xs text-muted">{it.targetMuscle}</span>
                  <TagBadges movement={it.movement} equipment={it.equipment} />
                </span>
                <span class="shrink-0 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-accent tabular-nums">
                  {it.targetSets} Sätze
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div class="px-4 py-6">
        <form
          method="post"
          action={`/plans/${plan.id}/delete`}
          data-confirm="Plan wirklich löschen? Absolvierte Trainings bleiben im Verlauf erhalten."
        >
          <button type="submit" class="btn-danger w-full">
            <Icon name="trash" size={18} />
            Plan löschen
          </button>
        </form>
      </div>
    </Layout>,
  );
});

app.post('/plans/:id/delete', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  await db.batch([
    db.delete(planExercises).where(eq(planExercises.planId, id)),
    db.delete(workoutPlans).where(eq(workoutPlans.id, id)),
  ]);
  return c.redirect('/', 303);
});

export default app;
