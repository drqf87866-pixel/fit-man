import { Icon } from './icons';

/**
 * Vorschaubild einer Übung.
 *
 * `image` ist der Slug aus free-exercise-db (siehe seed.sql); die Datei liegt
 * unter /img/exercises/<slug>.jpg und wird über das ASSETS-Binding ausgeliefert.
 * Eigene Übungen haben keinen Slug und bekommen die bisherige Icon-Kachel.
 *
 * `class` wird bewusst vom Aufrufer als Literal übergeben – Tailwind scannt den
 * Quelltext statisch, dynamisch zusammengesetzte Klassen (`size-${n}`) fehlen
 * sonst im generierten CSS.
 */
export const ExerciseThumb = ({
  image,
  category,
  class: cls,
  iconSize = 18,
}: {
  image: string;
  category: string;
  class: string;
  iconSize?: number;
}) =>
  image ? (
    <img
      src={`/img/exercises/${image}.jpg`}
      alt=""
      loading="lazy"
      decoding="async"
      onerror="this.onerror=null;this.src='/img/exercise-fallback.svg'"
      class={`${cls} shrink-0 bg-surface-2 object-cover`}
    />
  ) : (
    <div class={`${cls} grid shrink-0 place-items-center bg-surface-2 text-muted`}>
      <Icon name={category === 'Cardio' ? 'flame' : 'dumbbell'} size={iconSize} />
    </div>
  );
