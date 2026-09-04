import { ExerciseThumb } from './exercise-image';
import { TagBadges } from './tags';
import { Icon } from './icons';

/** Eine Übung im Plan – Schnittmenge aus getPlanExercises() und der Bibliothek. */
export type PlanEditorItem = {
  exerciseId: string;
  name: string;
  category: string;
  targetMuscle: string;
  movement: string;
  equipment: string;
  image: string;
  targetSets: number;
};

/**
 * Platzhalter für die Vorlage, aus der app.js neue Zeilen klont. Sie stehen in
 * denselben Feldern wie echte Werte, damit das Zeilenmarkup nur einmal
 * existiert: gerendert wird die Vorlage als <template>, ausgefüllt per
 * String-Replace im Client.
 */
const TEMPLATE_ITEM: PlanEditorItem = {
  exerciseId: '__ID__',
  name: '__NAME__',
  category: '__CATEGORY__',
  targetMuscle: '__MUSCLE__',
  movement: '',
  equipment: '',
  image: '__IMAGE__',
  targetSets: 3,
};

/**
 * Eine Zeile des Plans. Die Feldnamen (`exerciseId`, `order_<id>`,
 * `targetSets_<id>`) sind dieselben wie im alten Checkbox-Builder – der
 * Server-Teil (selectedExerciseIds/planExerciseInserts) bleibt unverändert.
 */
const PlanRow = ({ item, index, from }: { item: PlanEditorItem; index: number; from: string }) => {
  const id = item.exerciseId;
  const isTemplate = id === TEMPLATE_ITEM.exerciseId;
  return (
    <li class="rounded-xl border border-border bg-surface" data-plan-item data-exercise-id={id}>
      <input type="hidden" name="exerciseId" value={id} />
      {/* Position im Plan – app.js nummeriert beim Sortieren durch. */}
      <input type="hidden" name={`order_${id}`} value={index} data-plan-order />

      <div class="flex items-center gap-3 p-3">
        <span class="relative shrink-0">
          <ExerciseThumb
            image={item.image}
            category={item.category}
            class="size-11 rounded-lg"
            iconSize={20}
          />
          <span
            class="absolute -top-1 -left-1 grid size-5 place-items-center rounded-full bg-surface-2 text-[11px] font-bold text-muted ring-2 ring-surface tabular-nums"
            data-plan-position
          >
            {index + 1}
          </span>
        </span>
        <a href={`/exercises/${id}${from}`} class="min-w-0 flex-1">
          <span class="block truncate font-semibold" data-plan-name>
            {item.name}
          </span>
          <span class="block truncate text-xs text-muted">{item.targetMuscle || item.category}</span>
          {isTemplate ? (
            <div class="mt-1 flex flex-wrap gap-1" data-plan-tags></div>
          ) : (
            <TagBadges movement={item.movement} equipment={item.equipment} />
          )}
        </a>
        <button
          type="button"
          class="btn-ghost !min-w-11 !px-0 text-muted"
          data-plan-remove
          aria-label="Übung entfernen"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      <div class="flex items-center gap-2 border-t border-border px-3 py-2">
        <button
          type="button"
          class="btn-secondary !min-w-11 !px-0"
          data-order-up
          aria-label="Nach oben"
        >
          <Icon name="chevronUp" size={18} />
        </button>
        <button
          type="button"
          class="btn-secondary !min-w-11 !px-0"
          data-order-down
          aria-label="Nach unten"
        >
          <Icon name="chevronDown" size={18} />
        </button>
        <span class="text-sm text-muted">Sätze</span>
        <div class="ml-auto flex items-center gap-1">
          <button type="button" class="btn-secondary !min-w-11 !px-0" data-sets-dec aria-label="Ein Satz weniger">
            <Icon name="minus" size={18} />
          </button>
          <input
            type="number"
            name={`targetSets_${id}`}
            value={item.targetSets}
            min="1"
            max="20"
            inputmode="numeric"
            class="input w-16 text-center font-bold tabular-nums"
            data-sets-input
          />
          <button type="button" class="btn-secondary !min-w-11 !px-0" data-sets-inc aria-label="Ein Satz mehr">
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>
    </li>
  );
};

export type PlanEditorProps = {
  /** Nur die gewählten Übungen – die Bibliothek liegt im Picker-Sheet. */
  items: PlanEditorItem[];
  name?: string;
  /** Wandert unverändert mit (KI-Entwurf bzw. Bestand), wird nicht getippt. */
  description?: string;
  action: string;
  submitLabel?: string;
  /** Blendet den "KI-generiert"-Hinweis + "Neue Idee"-Link ein. */
  aiHint?: boolean;
  /** Zurück-Ziel der Übungsdetailseite, z. B. "/plans/xy". */
  detailFrom?: string;
};

export const PlanEditor = ({
  items,
  name = '',
  description = '',
  action,
  submitLabel = 'Plan speichern',
  aiHint = false,
  detailFrom,
}: PlanEditorProps) => {
  const from = detailFrom ? `?from=${encodeURIComponent(detailFrom)}` : '';
  return (
    <form method="post" action={action} class="flex flex-col gap-5 px-4 py-4" data-plan-form>
      {aiHint ? (
        <div class="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3">
          <Icon name="sparkles" size={18} class="mt-0.5 shrink-0 text-accent" />
          <p class="text-sm text-accent">
            KI-generierter Entwurf. Passe Übungen und Sätze an oder entferne welche – gespeichert
            wird wie gewohnt.
          </p>
        </div>
      ) : null}

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
          value={name}
        />
      </div>

      <input type="hidden" name="description" value={description} />

      <div>
        <div class="mb-2 flex items-baseline justify-between">
          <span class="label mb-0">Übungen im Plan</span>
          <span class="text-sm font-semibold text-accent tabular-nums" data-plan-count>
            {items.length} {items.length === 1 ? 'Übung' : 'Übungen'}
          </span>
        </div>

        <ul class="flex flex-col gap-2" data-plan-list>
          {items.map((item, index) => (
            <PlanRow item={item} index={index} from={from} />
          ))}
        </ul>

        <p
          class={`${items.length === 0 ? '' : 'hidden '}px-2 py-6 text-center text-sm text-muted`}
          data-plan-empty
        >
          Noch keine Übung im Plan. Füge unten welche aus der Bibliothek hinzu.
        </p>

        <button type="button" class="btn-secondary mt-3 w-full" data-plan-add>
          <Icon name="plus" size={20} />
          Übung hinzufügen
        </button>

        <noscript>
          <p class="mt-2 text-xs text-muted">
            Ohne JavaScript lassen sich nur Name, Reihenfolge und Sätze der vorhandenen Übungen
            ändern.
          </p>
        </noscript>
      </div>

      {/* Vorlage für die vom Picker eingefügten Zeilen – gleiches Markup wie oben. */}
      <template data-plan-row-tpl>
        <PlanRow item={TEMPLATE_ITEM} index={0} from={from} />
      </template>

      {aiHint ? (
        <a href="/plans/generate" class="btn-ghost w-full text-center">
          Neue Idee (erneut generieren)
        </a>
      ) : null}

      <div class="sticky bottom-24 z-20">
        <button type="submit" class="btn-primary w-full shadow-xl">
          <Icon name="save" size={20} />
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
