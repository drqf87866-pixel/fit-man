import { EQUIPMENT_LABELS, MOVEMENT_LABELS } from '../lib/tags';

export const TagBadges = ({ movement, equipment }: { movement: string; equipment: string }) => (
  <div class="mt-1 flex flex-wrap gap-1">
    {movement && MOVEMENT_LABELS[movement] ? (
      <span class="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
        {MOVEMENT_LABELS[movement]}
      </span>
    ) : null}
    {EQUIPMENT_LABELS[equipment] ? (
      <span class="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
        {EQUIPMENT_LABELS[equipment]}
      </span>
    ) : null}
  </div>
);
