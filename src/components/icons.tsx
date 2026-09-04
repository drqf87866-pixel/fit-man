import type { FC } from 'hono/jsx';

/**
 * Lucide Icons als Inline-SVG.
 * Server-Rendering ohne React – deshalb kein `lucide-react`, sondern die
 * originalen Lucide-Pfade in einer kleinen, tree-shake-freundlichen Map.
 * https://lucide.dev · ISC License
 */
const PATHS = {
  dumbbell: [
    'm6.5 6.5 11 11',
    'm21 21-1-1',
    'm3 3 1 1',
    'm18 22 4-4',
    'm2 6 4-4',
    'm3 10 7-7',
    'm14 21 7-7',
  ],
  library: [
    'M12 7v14',
    'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
  ],
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'],
  logOut: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  history: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
  plus: ['M5 12h14', 'M12 5v14'],
  minus: ['M5 12h14'],
  check: ['M20 6 9 17l-5-5'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  search: ['m21 21-4.34-4.34'],
  play: ['m6 3 14 9-14 9V3z'],
  trash: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  clock: ['M12 6v6l4 2'],
  calendar: ['M8 2v4', 'M16 2v4', 'M3 10h18'],
  timer: ['M10 2h4', 'M12 14v-4'],
  flame: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  ],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronDown: ['m6 9 6 6 6-6'],
  chevronUp: ['m18 15-6-6-6 6'],
  arrowLeft: ['m12 19-7-7 7-7', 'M19 12H5'],
  save: ['M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7', 'M7 3v4a1 1 0 0 0 1 1h7'],
  pencil: ['M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z', 'm15 5 4 4'],
  layers: ['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z', 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'],
  zap: ['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'],
  target: [],
  gripVertical: [],
  weight: ['M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'm5 8 1.6 10.4A2 2 0 0 0 8.57 20h6.86a2 2 0 0 0 1.97-1.6L19 8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z'],
  repeat: ['m17 2 4 4-4 4', 'M3 11v-1a4 4 0 0 1 4-4h14', 'm7 22-4-4 4-4', 'M21 13v1a4 4 0 0 1-4 4H3'],
  fileText: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z', 'M14 2v5h5', 'M10 9H8', 'M16 13H8', 'M16 17H8'],
  trendingUp: ['M16 7h6v6', 'm22 7-8.5 8.5-5-5L2 17'],
  sparkles: [
    'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
    'M20 3v4',
    'M22 5h-4',
    'M4 17v2',
    'M5 18H3',
  ],
} as const;

/** Icons mit zusätzlichen SVG-Primitiven (circle/rect), die kein <path> sind. */
const EXTRAS: Partial<Record<IconName, () => unknown>> = {
  search: () => <circle cx="11" cy="11" r="8" />,
  user: () => <circle cx="12" cy="7" r="4" />,
  clock: () => <circle cx="12" cy="12" r="10" />,
  calendar: () => <rect x="3" y="4" width="18" height="18" rx="2" />,
  timer: () => <circle cx="12" cy="14" r="8" />,
  target: () => (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  gripVertical: () => (
    <>
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

type IconProps = {
  name: IconName;
  size?: number;
  class?: string;
  strokeWidth?: number;
  fill?: string;
};

export const Icon: FC<IconProps> = ({ name, size = 24, class: cls = '', strokeWidth = 2, fill = 'none' }) => {
  const extra = EXTRAS[name];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'play' ? 'currentColor' : fill}
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      class={`shrink-0 ${cls}`}
      aria-hidden="true"
    >
      {extra ? extra() : null}
      {PATHS[name].map((d) => (
        <path d={d} />
      ))}
    </svg>
  );
};
