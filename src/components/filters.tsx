import { MOVEMENT_LABELS, EQUIPMENT_LABELS, MOVEMENT_VALUES, EQUIPMENT_VALUES } from '../lib/tags';

type Option = { value: string; label: string };

/**
 * Eine Filterzeile = eine unabhängige Gruppe. Innerhalb einer Zeile gilt
 * Einfachauswahl, zwischen den Zeilen werden die Filter UND-verknüpft
 * (z. B. Brust + Freihantel). "Alle" setzt nur die eigene Zeile zurück.
 */
const FilterRow = ({ label, group, options }: { label: string; group: string; options: Option[] }) => (
  <div>
    <p class="mb-1 text-[10px] font-bold tracking-wider text-muted uppercase">{label}</p>
    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
      <button type="button" class="chip chip-active" data-filter-group={group} data-filter-value="">
        Alle
      </button>
      {options.map((o) => (
        <button type="button" class="chip" data-filter-group={group} data-filter-value={o.value}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const movementOptions = () =>
  MOVEMENT_VALUES.map((value) => ({ value, label: MOVEMENT_LABELS[value] }));
const equipmentOptions = () =>
  EQUIPMENT_VALUES.map((value) => ({ value, label: EQUIPMENT_LABELS[value] }));

/** Filterzeilen für Übungslisten. `customCount` blendet die Herkunft-Zeile ein. */
export const ExerciseFilters = ({
  categories,
  customCount = 0,
}: {
  categories: string[];
  customCount?: number;
}) => (
  <div class="flex flex-col gap-2">
    <FilterRow
      label="Muskelgruppe"
      group="category"
      options={categories.map((value) => ({ value, label: value }))}
    />
    <FilterRow label="Bewegung" group="movement" options={movementOptions()} />
    <FilterRow label="Equipment" group="equipment" options={equipmentOptions()} />
    {customCount > 0 ? (
      <FilterRow
        label="Herkunft"
        group="custom"
        options={[{ value: '1', label: `Eigene (${customCount})` }]}
      />
    ) : null}
  </div>
);
