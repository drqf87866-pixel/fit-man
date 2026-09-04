import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { createDb } from '../db';
import { exercises } from '../db/schema';
import { countExerciseUsage, listExercises } from '../lib/queries';
import { newId } from '../lib/format';
import { CategoryBadge, Layout, PageHeader } from '../components/layout';
import { TagBadges } from '../components/tags';
import { Icon } from '../components/icons';
import {
  MOVEMENT_LABELS,
  EQUIPMENT_LABELS,
  MOVEMENT_VALUES,
  EQUIPMENT_VALUES,
} from '../lib/tags';
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
        <div class="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
          <button type="button" class="chip chip-active" data-ex-filter="">
            Alle
          </button>
          {categories.map((cat) => (
            <button type="button" class="chip" data-ex-filter={cat}>
              {cat}
            </button>
          ))}
          <span class="mx-1 w-px shrink-0 self-stretch bg-border" aria-hidden="true"></span>
          {MOVEMENT_VALUES.map((value) => (
            <button type="button" class="chip" data-ex-filter={value}>
              {MOVEMENT_LABELS[value]}
            </button>
          ))}
          <span class="mx-1 w-px shrink-0 self-stretch bg-border" aria-hidden="true"></span>
          {EQUIPMENT_VALUES.map((value) => (
            <button type="button" class="chip" data-ex-filter={value}>
              {EQUIPMENT_LABELS[value]}
            </button>
          ))}
          {customCount > 0 ? (
            <button type="button" class="chip" data-ex-filter="__custom">
              <Icon name="pencil" size={14} />
              Eigene ({customCount})
            </button>
          ) : null}
        </div>
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
            <div class="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
              <Icon name={ex.category === 'Cardio' ? 'flame' : 'dumbbell'} size={18} />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{ex.name}</p>
              <p class="truncate text-xs text-muted">{ex.targetMuscle || '—'}</p>
              <TagBadges movement={ex.movement} equipment={ex.equipment} />
            </div>
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

app.post('/exercises', async (c) => {
  const db = createDb(c.env.DB);
  const form = await c.req.formData();

  const name = String(form.get('name') ?? '').trim();
  const category = String(form.get('category') ?? '').trim() || 'Sonstige';
  const targetMuscle = String(form.get('targetMuscle') ?? '').trim();

  const movementRaw = String(form.get('movement') ?? '').trim();
  const equipmentRaw = String(form.get('equipment') ?? '').trim();

  const movement = MOVEMENT_VALUES.includes(movementRaw) ? movementRaw : '';
  const equipment = EQUIPMENT_VALUES.includes(equipmentRaw) ? equipmentRaw : '';

  if (name) {
    await db
      .insert(exercises)
      .values({ id: newId('ex'), name, category, targetMuscle, movement, equipment, isCustom: true });
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
