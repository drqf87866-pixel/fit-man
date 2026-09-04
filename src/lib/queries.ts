import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db';
import { exercises, planExercises, setLogs, workoutLogs } from '../db/schema';

/** Ein Satz aus einem früheren Workout – für die Spalte "Vorheriger Wert". */
export type PreviousSet = { setNumber: number; reps: number; weightKg: number };
export type PreviousMap = Record<string, { date: number; sets: PreviousSet[] }>;

/**
 * Letzte absolvierte Sätze je Übung (Quick History View).
 * Nimmt pro Übung das jeweils jüngste Workout, in dem sie abgehakt wurde.
 */
export async function getPreviousSets(db: DB): Promise<PreviousMap> {
  const rows = await db.all<{
    exercise_id: string;
    set_number: number;
    reps: number;
    weight_kg: number;
    date: number;
  }>(sql`
    SELECT sl.exercise_id, sl.set_number, sl.reps, sl.weight_kg, wl.date
    FROM set_logs sl
    JOIN workout_logs wl ON wl.id = sl.workout_log_id
    WHERE sl.completed = 1
      AND wl.date = (
        SELECT MAX(wl2.date)
        FROM set_logs sl2
        JOIN workout_logs wl2 ON wl2.id = sl2.workout_log_id
        WHERE sl2.exercise_id = sl.exercise_id AND sl2.completed = 1
      )
    ORDER BY sl.exercise_id, sl.set_number
  `);

  const map: PreviousMap = {};
  for (const r of rows) {
    const entry = (map[r.exercise_id] ??= { date: r.date, sets: [] });
    entry.sets.push({ setNumber: r.set_number, reps: r.reps, weightKg: r.weight_kg });
  }
  return map;
}

export type PlanListRow = {
  id: string;
  name: string;
  description: string;
  created_at: number;
  exercise_count: number;
  last_done: number | null;
};

/** Pläne inkl. Übungsanzahl und letztem Trainingsdatum. */
export function listPlans(db: DB) {
  return db.all<PlanListRow>(sql`
    SELECT p.id, p.name, p.description, p.created_at,
           (SELECT COUNT(*) FROM plan_exercises pe WHERE pe.plan_id = p.id) AS exercise_count,
           (SELECT MAX(wl.date) FROM workout_logs wl WHERE wl.plan_id = p.id) AS last_done
    FROM workout_plans p
    ORDER BY p.created_at DESC
  `);
}

/** Übungen eines Plans in der definierten Reihenfolge. */
export function getPlanExercises(db: DB, planId: string) {
  return db
    .select({
      id: planExercises.id,
      exerciseId: exercises.id,
      name: exercises.name,
      category: exercises.category,
      targetMuscle: exercises.targetMuscle,
      targetSets: planExercises.targetSets,
      order: planExercises.order,
    })
    .from(planExercises)
    .innerJoin(exercises, eq(exercises.id, planExercises.exerciseId))
    .where(eq(planExercises.planId, planId))
    .orderBy(planExercises.order);
}

export type WorkoutListRow = {
  id: string;
  plan_id: string | null;
  plan_name: string;
  date: number;
  duration_seconds: number;
  notes: string;
  exercise_count: number;
  set_count: number;
  volume: number;
};

/** Workout-Historie mit aggregierten Kennzahlen. */
export function listWorkouts(db: DB, limit = 100) {
  return db.all<WorkoutListRow>(sql`
    SELECT wl.id, wl.plan_id, wl.plan_name, wl.date, wl.duration_seconds, wl.notes,
           COUNT(DISTINCT sl.exercise_id) AS exercise_count,
           COUNT(sl.id) AS set_count,
           COALESCE(SUM(sl.reps * sl.weight_kg), 0) AS volume
    FROM workout_logs wl
    LEFT JOIN set_logs sl ON sl.workout_log_id = wl.id AND sl.completed = 1
    GROUP BY wl.id
    ORDER BY wl.date DESC
    LIMIT ${limit}
  `);
}

/** Ein Workout inkl. aller Sätze, gruppiert nach Übung. */
export async function getWorkoutDetail(db: DB, id: string) {
  const [log] = await db.select().from(workoutLogs).where(eq(workoutLogs.id, id)).limit(1);
  if (!log) return null;

  const rows = await db
    .select({
      id: setLogs.id,
      exerciseId: setLogs.exerciseId,
      name: exercises.name,
      category: exercises.category,
      targetMuscle: exercises.targetMuscle,
      setNumber: setLogs.setNumber,
      reps: setLogs.reps,
      weightKg: setLogs.weightKg,
      completed: setLogs.completed,
    })
    .from(setLogs)
    .innerJoin(exercises, eq(exercises.id, setLogs.exerciseId))
    .where(eq(setLogs.workoutLogId, id));

  type Row = (typeof rows)[number];
  const groups: { exerciseId: string; name: string; category: string; sets: Row[] }[] = [];
  for (const row of rows) {
    let g = groups.find((x) => x.exerciseId === row.exerciseId);
    if (!g) {
      g = { exerciseId: row.exerciseId, name: row.name, category: row.category, sets: [] };
      groups.push(g);
    }
    g.sets.push(row);
  }
  for (const g of groups) g.sets.sort((a, b) => a.setNumber - b.setNumber);

  return { log, groups };
}

/** Kennzahlen für den Kopf der Verlaufsseite. */
export async function getStats(db: DB) {
  const [row] = await db.all<{
    total: number;
    total_seconds: number;
    volume: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM workout_logs) AS total,
      (SELECT COALESCE(SUM(duration_seconds), 0) FROM workout_logs) AS total_seconds,
      (SELECT COALESCE(SUM(reps * weight_kg), 0) FROM set_logs WHERE completed = 1) AS volume
  `);
  return row ?? { total: 0, total_seconds: 0, volume: 0 };
}

/** Alle Übungen, gruppiert sortiert nach Kategorie und Name. */
export function listExercises(db: DB) {
  return db.select().from(exercises).orderBy(exercises.category, exercises.name);
}

/** Wie oft wurde eine Übung bereits geloggt? Schützt vor Löschen mit Historie. */
export async function countExerciseUsage(db: DB, exerciseId: string) {
  const [row] = await db.all<{ n: number }>(sql`
    SELECT
      (SELECT COUNT(*) FROM set_logs WHERE exercise_id = ${exerciseId}) +
      (SELECT COUNT(*) FROM plan_exercises WHERE exercise_id = ${exerciseId}) AS n
  `);
  return row?.n ?? 0;
}
