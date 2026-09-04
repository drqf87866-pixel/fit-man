import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { createDb } from '../db';
import { exercises } from '../db/schema';
import { countExerciseUsage, listExercises } from '../lib/queries';
import { newId } from '../lib/format';
import { CategoryBadge, Layout, PageHeader } from '../components/layout';
import { TagBadges } from '../components/tags';
import { ExerciseThumb } from '../components/exercise-image';
import { Icon } from '../components/icons';
import {
  MOVEMENT_LABELS,
  EQUIPMENT_LABELS,
  MOVEMENT_VALUES,
  EQUIPMENT_VALUES,
} from '../lib/tags';
import { ExerciseFilters } from '../components/filters';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

/** Vorschlagswerte für die Kategorie einer eigenen Übung. */
const DEFAULT_CATEGORIES = ['Brust', 'Rücken', 'Beine', 'Schultern', 'Arme', 'Rumpf', 'Cardio'];

// ---------------------------------------------------------------------------
// Screen 3: Übungsbibliothek  (/exercises)
// ---------------------------------------------------------------------------
app.get('/exercises', async (c) => {
  const db = createDb(c.env.DB);
  const all = await listExercises(db);
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...all.map((e) => e.category)])];
  const customCount = all.filter((e) => e.isCustom).length;

  return c.html(
    <Layout title="Übungen" active="exercises">
      <PageHeader title="Übungen" subtitle={`${all.length} in der Bibliothek`}>
        <button type="button" class="btn-secondary !px-3" data-open-dialog="new-exercise" aria-label="Eigene Übung hinzufügen">
          <Icon name="plus" size={20} />
        </button>
      </PageHeader>

      {/* Suche bleibt beim Scrollen stehen, die Filterzeilen scrollen mit weg –
          vier klebende Zeilen würden auf dem Handy zu viel Platz kosten. */}
      <div class="sticky top-[73px] z-20 bg-bg/90 px-4 pt-3 pb-2 backdrop-blur-md">
        <div class="relative">
          <Icon
            name="search"
            size={18}
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            class="input pl-10"
            type="search"
            placeholder="Übung oder Muskel suchen"
            data-ex-search
            autocomplete="off"
          />
        </div>
      </div>

      <div class="px-4 pt-1 pb-2" data-ex-filters>
        <ExerciseFilters categories={categories} customCount={customCount} />
      </div>

      <ul class="flex flex-col gap-2 px-4 py-3" data-ex-list>
        {all.map((ex) => (
          <li
            class="card flex items-center gap-3 !p-3"
            data-ex-item
            data-category={ex.category}
            data-movement={ex.movement}
            data-equipment={ex.equipment}
            data-custom={ex.isCustom ? '1' : '0'}
            data-search={`${ex.name} ${ex.targetMuscle} ${ex.category} ${MOVEMENT_LABELS[ex.movement] ?? ''} ${EQUIPMENT_LABELS[ex.equipment] ?? ''}`.toLowerCase()}
          >
            <a href={`/exercises/${ex.id}`} class="flex min-w-0 flex-1 items-center gap-3">
              <ExerciseThumb image={ex.image} category={ex.category} class="size-10 rounded-xl" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">{ex.name}</p>
                <p class="truncate text-xs text-muted">{ex.targetMuscle || '—'}</p>
                <TagBadges movement={ex.movement} equipment={ex.equipment} />
              </div>
            </a>
            <CategoryBadge category={ex.category} custom={ex.isCustom} />
            {ex.isCustom ? (
              <form
                method="post"
                action={`/exercises/${ex.id}/delete`}
                data-confirm={`"${ex.name}" löschen?`}
              >
                <button type="submit" class="btn-ghost !min-w-11 !px-0 text-muted" aria-label="Übung löschen">
                  <Icon name="trash" size={18} />
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>

      <p class="hidden px-4 py-10 text-center text-sm text-muted" data-ex-empty>
        Keine Übung gefunden.
      </p>

      <div class="px-4 pb-6">
        <button type="button" class="btn-secondary w-full" data-open-dialog="new-exercise">
          <Icon name="plus" size={20} />
          Eigene Übung hinzufügen
        </button>
      </div>

      {/* Bottom-Sheet: eigene Übung anlegen */}
      <div
        class="fixed inset-0 z-50 hidden items-end bg-black/60 backdrop-blur-sm"
        data-dialog="new-exercise"
      >
        <form
          method="post"
          action="/exercises"
          class="mx-auto w-full max-w-lg rounded-t-3xl border-t border-border bg-surface p-4 pb-8 safe-bottom"
        >
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-border"></div>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold">Eigene Übung</h2>
            <button type="button" class="btn-ghost !min-w-11 !px-0" data-close-dialog aria-label="Schließen">
              <Icon name="x" size={22} />
            </button>
          </div>

          <div class="flex flex-col gap-4">
            <div>
              <label class="label" for="ex-name">
                Name
              </label>
              <input
                class="input"
                id="ex-name"
                name="name"
                required
                maxlength={60}
                placeholder="z. B. Landmine Press"
                autocomplete="off"
              />
            </div>

            <div>
              <label class="label" for="ex-category">
                Muskelgruppe
              </label>
              <select class="input" id="ex-category" name="category" required>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label class="label" for="ex-movement">
                Bewegungsmuster (optional)
              </label>
              <select class="input" id="ex-movement" name="movement">
                <option value="">Keins</option>
                {MOVEMENT_VALUES.map((value) => (
                  <option value={value}>{MOVEMENT_LABELS[value]}</option>
                ))}
              </select>
            </div>

            <div>
              <label class="label" for="ex-equipment">
                Equipment
              </label>
              <select class="input" id="ex-equipment" name="equipment" required>
                {EQUIPMENT_VALUES.map((value) => (
                  <option value={value}>{EQUIPMENT_LABELS[value]}</option>
                ))}
              </select>
            </div>

            <div>
              <label class="label" for="ex-target">
                Zielmuskel (optional)
              </label>
              <input
                class="input"
                id="ex-target"
                name="targetMuscle"
                maxlength={60}
                placeholder="z. B. Deltoideus anterior"
                autocomplete="off"
              />
            </div>

            <div>
              <label class="label" for="ex-description">
                Beschreibung (optional)
              </label>
              <textarea
                class="input min-h-24 py-2"
                id="ex-description"
                name="description"
                maxlength={600}
                rows={3}
                placeholder="Kurze Erklärung zur Ausführung"
              ></textarea>
            </div>

            <button type="submit" class="btn-primary w-full">
              <Icon name="check" size={20} />
              Übung speichern
            </button>
          </div>
        </form>
      </div>
    </Layout>,
  );
});

// ---------------------------------------------------------------------------
// Übungsdetail  (/exercises/:id)
// ---------------------------------------------------------------------------
app.get('/exercises/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const [ex] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  if (!ex) return c.notFound();

  // Zurück dorthin, wo der Aufruf herkam (Bibliothek oder Plan-Detail).
  // Nur repo-interne Pfade zulassen, damit der Link nicht nach außen zeigt.
  const fromRaw = c.req.query('from') ?? '';
  const back = fromRaw.startsWith('/') && !fromRaw.startsWith('//') ? fromRaw : '/exercises';

  return c.html(
    <Layout title={ex.name} active="exercises">
      <PageHeader title={ex.name} subtitle={ex.category} back={back} />

      {ex.image ? (
        <div class="grid grid-cols-2 gap-2 px-4 pt-4">
          {[
            { src: `/img/exercises/${ex.image}.jpg`, label: 'Startposition' },
            { src: `/img/exercises/${ex.image}_end.jpg`, label: 'Endposition' },
          ].map((img) => (
            <figure class="m-0">
              <img
                src={img.src}
                alt={`${ex.name} – ${img.label}`}
                decoding="async"
                width="850"
                height="567"
                class="aspect-[3/2] w-full rounded-xl bg-surface-2 object-cover"
              />
              <figcaption class="mt-1 text-center text-[11px] font-semibold tracking-wide text-muted uppercase">
                {img.label}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {ex.description ? (
        <section class="px-4 pt-5">
          <h2 class="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Ausführung</h2>
          <p class="text-[15px] leading-relaxed">{ex.description}</p>
        </section>
      ) : null}

      <section class="px-4 pt-5">
        <h2 class="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Details</h2>
        <dl class="card flex flex-col gap-2 !p-4 text-sm">
          <div class="flex items-baseline justify-between gap-3">
            <dt class="text-muted">Kategorie</dt>
            <dd class="text-right font-semibold">{ex.category}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <dt class="text-muted">Zielmuskel</dt>
            <dd class="text-right font-semibold">{ex.targetMuscle || '—'}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <dt class="text-muted">Bewegung</dt>
            <dd class="text-right font-semibold">{MOVEMENT_LABELS[ex.movement] ?? '—'}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <dt class="text-muted">Equipment</dt>
            <dd class="text-right font-semibold">{EQUIPMENT_LABELS[ex.equipment] ?? '—'}</dd>
          </div>
        </dl>
      </section>

      {ex.image ? (
        <p class="px-4 pt-4 pb-6 text-xs text-muted">
          Bilder: free-exercise-db (Public Domain)
        </p>
      ) : (
        <div class="pb-6" />
      )}
    </Layout>,
  );
});

app.post('/exercises', async (c) => {
  const db = createDb(c.env.DB);
  const form = await c.req.formData();

  const name = String(form.get('name') ?? '').trim();
  const category = String(form.get('category') ?? '').trim() || 'Sonstige';
  const targetMuscle = String(form.get('targetMuscle') ?? '').trim();
  const description = String(form.get('description') ?? '').trim().slice(0, 600);

  const movementRaw = String(form.get('movement') ?? '').trim();
  const equipmentRaw = String(form.get('equipment') ?? '').trim();

  const movement = MOVEMENT_VALUES.includes(movementRaw) ? movementRaw : '';
  const equipment = EQUIPMENT_VALUES.includes(equipmentRaw) ? equipmentRaw : '';

  if (name) {
    await db
      .insert(exercises)
      .values({
        id: newId('ex'),
        name,
        category,
        targetMuscle,
        movement,
        equipment,
        description,
        isCustom: true,
      });
  }
  return c.redirect('/exercises', 303);
});

app.post('/exercises/:id/delete', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  // Nur eigene Übungen, und nur solange sie in keinem Plan/Log referenziert sind.
  const usage = await countExerciseUsage(db, id);
  if (usage === 0) {
    await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.isCustom, true)));
  }
  return c.redirect('/exercises', 303);
});

/** JSON-Liste für den Übungs-Picker im aktiven Workout. */
app.get('/api/exercises', async (c) => {
  const db = createDb(c.env.DB);
  return c.json(await listExercises(db));
});

export default app;
