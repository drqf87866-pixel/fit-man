import type { FC } from 'hono/jsx';
import type { ProgressPoint } from '../lib/queries';
import { formatDateShort, formatVolume, formatWeight } from '../lib/format';

/**
 * Verlaufskurve als reines Inline-SVG – bewusst ohne Chart-Bibliothek, passend
 * zu icons.tsx, das Lucide-Pfade ebenfalls direkt rendert. Kein Client-JS.
 *
 * Das SVG skaliert über `viewBox` + `width: 100%`; Beschriftungen liegen als
 * normales HTML darunter, damit sie nicht mitskaliert und unleserlich werden.
 */

const W = 300;
const H = 110;
const PAD = 8;

type Props = {
  points: ProgressPoint[];
  metric: 'top_kg' | 'volume';
};

export const ProgressChart: FC<Props> = ({ points, metric }) => {
  const values = points.map((p) => (metric === 'top_kg' ? p.top_kg : p.volume));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;

  const x = (i: number) =>
    points.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (points.length - 1);
  // 6 % Luft oben und unten, damit Punkte nicht am Rand kleben. Immer dasselbe
  // Gewicht ergibt keine Spannweite – die Linie läuft dann mittig, nicht unten.
  const y = (v: number) => {
    const inner = H - 2 * PAD;
    const t = span === 0 ? 0.5 : (v - min) / span;
    return H - PAD - t * inner * 0.88 - inner * 0.06;
  };

  const line = points.map((_, i) => `${x(i).toFixed(1)},${y(values[i]).toFixed(1)}`).join(' ');
  const area = `${PAD},${H} ${line} ${(W - PAD).toFixed(1)},${H}`;

  const label = metric === 'top_kg' ? 'Schwerster Satz' : 'Volumen';
  const fmt = (v: number) => (metric === 'top_kg' ? `${formatWeight(v)} kg` : formatVolume(v));

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        class="h-28 w-full overflow-visible"
        role="img"
        aria-label={`${label}: ${fmt(min)} bis ${fmt(max)} über ${points.length} Einheiten`}
      >
        <title>{`${label} über die letzten ${points.length} Einheiten`}</title>
        <polygon points={area} fill="var(--color-accent)" opacity="0.12" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-accent)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        {points.map((_, i) => (
          <circle
            cx={x(i)}
            cy={y(values[i])}
            r={i === points.length - 1 ? 4 : 2.5}
            fill="var(--color-accent)"
          />
        ))}
      </svg>

      <div class="mt-2 flex items-baseline justify-between text-xs text-muted tabular-nums">
        <span>{formatDateShort(new Date(points[0].date * 1000))}</span>
        <span class="font-semibold text-accent">
          {fmt(values[values.length - 1])}
        </span>
        <span>{formatDateShort(new Date(points[points.length - 1].date * 1000))}</span>
      </div>
    </div>
  );
};
