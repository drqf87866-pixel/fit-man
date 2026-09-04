import type { FC, PropsWithChildren } from 'hono/jsx';
import { Icon, type IconName } from './icons';

export type NavKey = 'training' | 'exercises' | 'history' | null;

const NAV: { key: Exclude<NavKey, null>; href: string; label: string; icon: IconName }[] = [
  { key: 'training', href: '/', label: 'Training', icon: 'dumbbell' },
  { key: 'exercises', href: '/exercises', label: 'Übungen', icon: 'library' },
  { key: 'history', href: '/history', label: 'Verlauf', icon: 'history' },
];

/**
 * Prerender der Tab-Ziele (Speculation Rules).
 *
 * Wir sind eine klassische MPA – jeder Tab-Wechsel ist eine echte Navigation.
 * Ein aktivierter Prerender wird dagegen sofort eingeblendet, der Wechsel
 * kostet also keine Ladezeit mehr.
 *
 * `immediate` rendert schon beim Seitenaufbau vor, nicht erst beim Antippen:
 * Bei `moderate` (pointerdown) war der Prerender bis zum Loslassen des Fingers
 * nicht fertig – /history zieht Workouts, Stats und Recaps aus D1 – und Chrome
 * fiel auf eine normale Navigation zurück. Chrome hält für nicht-conservative
 * Eagerness maximal zwei Prerender gleichzeitig; da eine der drei Seiten immer
 * die aktuelle ist, bleiben genau zwei Kandidaten und die Grenze passt.
 *
 * Preis dafür sind zwei zusätzliche Seitenrenderings (und damit D1-Reads) pro
 * Seitenaufruf. Nur die Nav-Ziele stehen in der Liste: alles GET und
 * nebenwirkungsfrei. Browser ohne Speculation Rules (Safari) ignorieren das
 * Script.
 *
 * Offen: Ob damit auch Chromes eigener Ladebalken im Standalone-PWA-Modus
 * verschwindet, ist unbestätigt – mit `moderate` tat er es nicht.
 */
const SPECULATION_RULES = JSON.stringify({
  prerender: [
    {
      where: { any_of: NAV.map((item) => ({ href_matches: item.href })) },
      eagerness: 'immediate',
    },
  ],
});

const BottomNav: FC<{ active: NavKey }> = ({ active }) => (
  <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md safe-bottom">
    <ul class="mx-auto flex max-w-lg">
      {NAV.map((item) => {
        const on = item.key === active;
        return (
          <li class="flex-1">
            <a
              href={item.href}
              aria-current={on ? 'page' : undefined}
              class={`flex min-h-[60px] touch flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                on ? 'text-accent' : 'text-muted active:text-ink'
              }`}
            >
              <Icon name={item.icon} size={22} strokeWidth={on ? 2.4 : 2} />
              <span>{item.label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  </nav>
);

type LayoutProps = PropsWithChildren<{
  title: string;
  active?: NavKey;
  /** Blendet die Bottom-Nav aus (z. B. im aktiven Workout) */
  bare?: boolean;
}>;

export const Layout: FC<LayoutProps> = ({ title, active = null, bare = false, children }) => (
  <html lang="de">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#0a0e13" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <title>{title} · FitMan</title>
      <link rel="stylesheet" href="/styles.css" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      {bare ? null : (
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{ __html: SPECULATION_RULES }}
        />
      )}
    </head>
    <body class={bare ? '' : 'pb-24'}>
      <div class="mx-auto min-h-dvh max-w-lg">{children}</div>
      {bare ? null : <BottomNav active={active} />}
      <script src="/app.js" defer></script>
    </body>
  </html>
);

/** Sticky Kopfzeile mit optionaler Zurück-Navigation und Aktion rechts. */
export const PageHeader: FC<
  PropsWithChildren<{ title: string; subtitle?: string; back?: string }>
> = ({ title, subtitle, back, children }) => (
  <header class="sticky top-0 z-30 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-md">
    <div class="flex items-center gap-3">
      {back ? (
        <a href={back} class="btn-ghost -ml-2 !px-2" aria-label="Zurück">
          <Icon name="arrowLeft" size={22} />
        </a>
      ) : null}
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p class="truncate text-sm text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  </header>
);

export const EmptyState: FC<{ icon: IconName; title: string; text: string }> = ({
  icon,
  title,
  text,
}) => (
  <div class="flex flex-col items-center gap-3 px-6 py-14 text-center">
    <div class="grid size-16 place-items-center rounded-2xl border border-border bg-surface text-muted">
      <Icon name={icon} size={28} />
    </div>
    <h2 class="text-lg font-semibold">{title}</h2>
    <p class="max-w-xs text-sm text-muted">{text}</p>
  </div>
);

/** Kleines farbiges Kategorie-Label. */
export const CategoryBadge: FC<{ category: string; custom?: boolean }> = ({ category, custom }) => (
  <span
    class={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
      custom ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted'
    }`}
  >
    {category}
  </span>
);
