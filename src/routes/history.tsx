import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb } from '../db';
import { setLogs, workoutLogs } from '../db/schema';
import { getStats, getWorkoutDetail, listWorkouts } from '../lib/queries';
import {
  formatDate,
  formatDuration,
  formatDurationLong,
  formatRelative,
  formatVolume,
  formatWeight,
} from '../lib/format';
import { EmptyState, Layout, PageHeader } from '../components/layout';
import { Icon, type IconName } from '../components/icons';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

const Stat = ({ icon, value, label }: { icon: IconName; value: string; label: string }) => (
  <div class="card flex flex-col items-center gap-1 !p-3 text-center">
    <Icon name={icon} size={18} class="text-accent" />
    <span class="text-lg leading-tight font-bold tabular-nums">{value}</span>
    <span class="text-[11px] text-muted">{label}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Screen 4: Verlauf  (/history)
// ---------------------------------------------------------------------------
app.get('/history', async (c) => {
  const db = createDb(c.env.DB);
  const [workouts, stats] = await Promise.all([listWorkouts(db), getStats(db)]);

  return c.html(
    <Layout title="Verlauf" active="history">
      <PageHeader title="Verlauf" subtitle="Deine absolvierten Trainings" />

      {workouts.length === 0 ? (
        <EmptyState
          icon="history"
          title="Noch kein Training"
          text="Sobald du dein erstes Workout beendest, findest du es hier mit allen Sätzen wieder."
        />
      ) : (
        <>
          <div class="grid grid-cols-3 gap-2 px-4 py-4">
            <Stat icon="flame" value={String(stats.total)} label="Trainings" />
            <Stat
              icon="clock"
              value={formatDurationLong(stats.total_seconds)}
              label="Gesamtzeit"
            />
            <Stat icon="trendingUp" value={formatVolume(stats.volume)} label="Volumen" />
          </div>

          <ul class="flex flex-col gap-3 px-4 pb-6">
            {workouts.map((w) => {
              const date = new Date(w.date * 1000);
              return (
                <li>
                  <a href={`/history/${w.id}`} class="card flex items-center gap-3">
                    <div class="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                      <Icon name="dumbbell" size={20} />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-bold">{w.plan_name}</p>
                      <p class="text-xs text-muted">
                        {formatRelative(date)} · {formatDurationLong(w.duration_seconds)}
                      </p>
                      <p class="mt-1 text-xs text-muted tabular-nums">
                        {w.exercise_count} Übungen · {w.set_count} Sätze ·{' '}
                        {formatVolume(w.volume)}
                      </p>
                    </div>
                    <Icon name="chevronRight" size={20} class="text-muted" />
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Layout>,
  );
});

// ---------------------------------------------------------------------------
// Detailansicht eines Workouts
// ---------------------------------------------------------------------------
app.get('/history/:id', async (c) => {
  const db = createDb(c.env.DB);
  const detail = await getWorkoutDetail(db, c.req.param('id'));
  if (!detail) return c.notFound();

  const { log, groups } = detail;
  const date = new Date(log.date.getTime());
  const volume = groups
    .flatMap((g) => g.sets)
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.reps * s.weightKg, 0);
  const setCount = groups.flatMap((g) => g.sets).filter((s) => s.completed).length;

  return c.html(
    <Layout title={log.planName} active="history">
      <PageHeader title={log.planName} subtitle={formatDate(date)} back="/history" />

      <div class="grid grid-cols-3 gap-2 px-4 py-4">
        <Stat icon="clock" value={formatDuration(log.durationSeconds)} label="Dauer" />
        <Stat icon="repeat" value={String(setCount)} label="Sätze" />
        <Stat icon="trendingUp" value={formatVolume(volume)} label="Volumen" />
      </div>

      {log.notes ? (
        <div class="px-4 pb-4">
          <div class="card flex gap-3 !p-3">
            <Icon name="fileText" size={18} class="mt-0.5 text-muted" />
            <p class="text-sm whitespace-pre-wrap">{log.notes}</p>
          </div>
        </div>
      ) : null}

      <section class="flex flex-col gap-3 px-4 pb-6">
        {groups.map((g) => (
          <article class="card !p-0 overflow-hidden">
            <header class="flex items-center gap-2 border-b border-border px-4 py-3">
              <h2 class="min-w-0 flex-1 truncate font-bold">{g.name}</h2>
              <span class="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                {g.category}
              </span>
            </header>
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-[11px] tracking-wide text-muted uppercase">
                  <th class="py-2 pl-4 font-semibold">Satz</th>
                  <th class="py-2 text-right font-semibold">kg</th>
                  <th class="py-2 text-right font-semibold">Wdh.</th>
                  <th class="py-2 pr-4 text-right font-semibold">Vol.</th>
                </tr>
              </thead>
              <tbody>
                {g.sets.map((s) => (
                  <tr class={`border-t border-border/60 ${s.completed ? '' : 'opacity-40'}`}>
                    <td class="py-2.5 pl-4 font-semibold tabular-nums">
                      <span class="inline-flex items-center gap-1.5">
                        {s.setNumber}
                        {s.completed ? (
                          <Icon name="check" size={14} class="text-done" />
                        ) : (
                          <Icon name="x" size={14} class="text-muted" />
                        )}
                      </span>
                    </td>
                    <td class="py-2.5 text-right tabular-nums">{formatWeight(s.weightKg)}</td>
                    <td class="py-2.5 text-right tabular-nums">{s.reps}</td>
                    <td class="py-2.5 pr-4 text-right text-muted tabular-nums">
                      {Math.round(s.reps * s.weightKg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </section>

      <div class="px-4 pb-6">
        <form
          method="post"
          action={`/history/${log.id}/delete`}
          data-confirm="Dieses Training endgültig aus dem Verlauf löschen?"
        >
          <button type="submit" class="btn-danger w-full">
            <Icon name="trash" size={18} />
            Training löschen
          </button>
        </form>
      </div>
    </Layout>,
  );
});

app.post('/history/:id/delete', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  await db.batch([
    db.delete(setLogs).where(eq(setLogs.workoutLogId, id)),
    db.delete(workoutLogs).where(eq(workoutLogs.id, id)),
  ]);
  return c.redirect('/history', 303);
});

export default app;
