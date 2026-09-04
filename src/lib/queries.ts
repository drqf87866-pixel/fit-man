import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DB } from '../db';
import { exercises, planExercises, recaps, setLogs, workoutLogs, type Recap } from '../db/schema';
import { newId } from './format';

/**
 * Konvention: Jede nutzerspezifische Query nimmt userId direkt nach db.
 * Die Werte kommen aus der Session (middleware/auth.ts) – Queries dürfen
 * niemals "offen" (ohne User-Filter) bleiben, sonst sehen Nutzer fremde Daten.
 */

/** Ein Satz aus einem früheren Workout – für die Spalte "Vorheriger Wert". */
export type PreviousSet = { setNumber: number; reps: number; weightKg: number };
export type PreviousMap = Record<string, { date: number; sets: PreviousSet[] }>;

/**
 * Letzte absolvierte Sätze je Übung (Quick History View).
 * Nimmt pro Übung das jeweils jüngste Workout, in dem sie abgehakt wurde.
 * Der User-Filter muss auch in die korrelierte MAX-Subquery – sonst gewinnt
 * das jüngste FREMDE Workout und "Vorheriger Wert" leakt über die Nutzer.
 */
export async function getPreviousSets(db: DB, userId: string): Promise<PreviousMap> {
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
      AND wl.user_id = ${userId}
      AND wl.date = (
        SELECT MAX(wl2.date)
        FROM set_logs sl2
        JOIN workout_logs wl2 ON wl2.id = sl2.workout_log_id
        WHERE sl2.exercise_id = sl.exercise_id AND sl2.completed = 1
          AND wl2.user_id = ${userId}
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
export function listPlans(db: DB, userId: string) {
  return db.all<PlanListRow>(sql`
    SELECT p.id, p.name, p.description, p.created_at,
           (SELECT COUNT(*) FROM plan_exercises pe WHERE pe.plan_id = p.id) AS exercise_count,
           (SELECT MAX(wl.date) FROM workout_logs wl WHERE wl.plan_id = p.id) AS last_done
    FROM workout_plans p
    WHERE p.user_id = ${userId}
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
      movement: exercises.movement,
      equipment: exercises.equipment,
      image: exercises.image,
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
export function listWorkouts(db: DB, userId: string, limit = 100) {
  return db.all<WorkoutListRow>(sql`
    SELECT wl.id, wl.plan_id, wl.plan_name, wl.date, wl.duration_seconds, wl.notes,
           COUNT(DISTINCT sl.exercise_id) AS exercise_count,
           COUNT(sl.id) AS set_count,
           COALESCE(SUM(sl.reps * sl.weight_kg), 0) AS volume
    FROM workout_logs wl
    LEFT JOIN set_logs sl ON sl.workout_log_id = wl.id AND sl.completed = 1
    WHERE wl.user_id = ${userId}
    GROUP BY wl.id
    ORDER BY wl.date DESC
    LIMIT ${limit}
  `);
}

/** Ein Workout inkl. aller Sätze, gruppiert nach Übung – nur der eigene. */
export async function getWorkoutDetail(db: DB, userId: string, id: string) {
  const [log] = await db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)))
    .limit(1);
  if (!log) return null;

  const rows = await db
    .select({
      id: setLogs.id,
      exerciseId: setLogs.exerciseId,
      name: exercises.name,
      category: exercises.category,
      targetMuscle: exercises.targetMuscle,
      movement: exercises.movement,
      equipment: exercises.equipment,
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
export async function getStats(db: DB, userId: string) {
  const [row] = await db.all<{
    total: number;
    total_seconds: number;
    volume: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM workout_logs WHERE user_id = ${userId}) AS total,
      (SELECT COALESCE(SUM(duration_seconds), 0) FROM workout_logs WHERE user_id = ${userId}) AS total_seconds,
      (SELECT COALESCE(SUM(sl.reps * sl.weight_kg), 0)
         FROM set_logs sl
         JOIN workout_logs wl ON wl.id = sl.workout_log_id
         WHERE sl.completed = 1 AND wl.user_id = ${userId}) AS volume
  `);
  return row ?? { total: 0, total_seconds: 0, volume: 0 };
}

/**
 * Alle Übungen: die globale Standard-Bibliothek (is_custom = 0, via Seed)
 * plus die eigenen Übungen des Nutzers. Reihenfolge wie gehabt.
 */
export function listExercises(db: DB, userId: string) {
  return db
    .select()
    .from(exercises)
    .where(sql`is_custom = 0 OR user_id = ${userId}`)
    .orderBy(exercises.category, exercises.name);
}

/** Wie oft wurde eine Übung bereits geloggt? Schützt vor Löschen mit Historie. */
export async function countExerciseUsage(db: DB, userId: string, exerciseId: string) {
  const [row] = await db.all<{ n: number }>(sql`
    SELECT
      (SELECT COUNT(*) FROM set_logs sl
         JOIN workout_logs wl ON wl.id = sl.workout_log_id
         WHERE sl.exercise_id = ${exerciseId} AND wl.user_id = ${userId}) +
      (SELECT COUNT(*) FROM plan_exercises pe
         JOIN workout_plans p ON p.id = pe.plan_id
         WHERE pe.exercise_id = ${exerciseId} AND p.user_id = ${userId}) AS n
  `);
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Wochen-Recap (Feature: KI-Rückblick je ISO-Woche)
// ---------------------------------------------------------------------------

/** Workouts innerhalb [fromSec, toSec) inkl. Satz-/Volumen-Aggregaten. */
export function listWorkoutsRange(db: DB, userId: string, fromSec: number, toSec: number) {
  return db.all<WorkoutListRow>(sql`
    SELECT wl.id, wl.plan_id, wl.plan_name, wl.date, wl.duration_seconds, wl.notes,
           COUNT(DISTINCT sl.exercise_id) AS exercise_count,
           COUNT(sl.id) AS set_count,
           COALESCE(SUM(sl.reps * sl.weight_kg), 0) AS volume
    FROM workout_logs wl
    LEFT JOIN set_logs sl ON sl.workout_log_id = wl.id AND sl.completed = 1
    WHERE wl.user_id = ${userId}
      AND wl.date >= ${fromSec} AND wl.date < ${toSec}
    GROUP BY wl.id
    ORDER BY wl.date DESC
  `);
}

export type WeekExerciseAggRow = {
  exercise_id: string;
  name: string;
  category: string;
  movement: string;
  equipment: string;
  workout_count: number;
  set_count: number;
  reps: number;
  volume: number;
  max_kg: number;
};

/** Pro Übung aggregierte Wochenwerte – kompakte Datenbasis für den LLM-Prompt. */
export async function getWeekExerciseAggregates(
  db: DB,
  userId: string,
  fromSec: number,
  toSec: number,
) {
  return db.all<WeekExerciseAggRow>(sql`
    SELECT e.id AS exercise_id, e.name, e.category, e.movement, e.equipment,
           COUNT(DISTINCT wl.id)  AS workout_count,
           COUNT(sl.id)           AS set_count,
           COALESCE(SUM(sl.reps), 0)                AS reps,
           COALESCE(SUM(sl.reps * sl.weight_kg), 0) AS volume,
           COALESCE(MAX(sl.weight_kg), 0)           AS max_kg
    FROM set_logs sl
    JOIN workout_logs wl ON wl.id = sl.workout_log_id
    JOIN exercises e     ON e.id = sl.exercise_id
    WHERE sl.completed = 1
      AND wl.user_id = ${userId}
      AND wl.date >= ${fromSec} AND wl.date < ${toSec}
    GROUP BY e.id
    ORDER BY volume DESC
    LIMIT 40
  `);
}

/** Gespeicherte Recaps des Nutzers für die übergebenen Wochenschlüssel. */
export async function listRecaps(db: DB, userId: string, weekKeys: string[]): Promise<Recap[]> {
  if (weekKeys.length === 0) return [];
  return db
    .select()
    .from(recaps)
    .where(and(eq(recaps.userId, userId), inArray(recaps.weekKey, weekKeys)));
}

/**
 * Wie listRecaps, aber robust gegen eine noch nicht migrierte Tabelle:
 * schlägt das Lesen fehl (Migration fehlt), wird "kein Recap" zurückgegeben,
 * statt GET /history mit einem 500 abzuschießen.
 */
export async function listRecapsSafe(db: DB, userId: string, weekKeys: string[]): Promise<Recap[]> {
  try {
    return await listRecaps(db, userId, weekKeys);
  } catch (err) {
    console.error('[fit-man] recaps lesen fehlgeschlagen', err);
    return [];
  }
}

export type NewRecapData = {
  weekKey: string;
  year: number;
  week: number;
  headline: string;
  summary: string;
  highlightsJson: string;
  tip: string | null;
};

/** Insert oder Update je Woche – eindeutiger Zielschlüssel ist (user, week). */
export async function upsertRecap(db: DB, userId: string, r: NewRecapData): Promise<void> {
  const now = new Date();
  await db
    .insert(recaps)
    .values({ id: newId('rec'), userId, ...r, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [recaps.userId, recaps.weekKey],
      set: {
        year: r.year,
        week: r.week,
        headline: r.headline,
        summary: r.summary,
        highlightsJson: r.highlightsJson,
        tip: r.tip,
        updatedAt: now,
      },
    });
}

// ---------------------------------------------------------------------------
// Fortschritt je Übung (Feature: Verlaufskurve auf der Übungsdetailseite)
// ---------------------------------------------------------------------------

/** Eine Trainingseinheit, in der diese Übung geloggt wurde. */
export type ProgressPoint = {
  date: number;
  /** Schwerstes Gewicht der Einheit */
  top_kg: number;
  /** Wiederholungen des schwersten Satzes (bei Gleichstand: die meisten) */
  top_reps: number;
  volume: number;
  sets: number;
};

/**
 * Verlauf einer Übung, jüngste Einheiten zuerst begrenzt, zurückgegeben
 * aber aufsteigend – so kann das Chart direkt von links nach rechts zeichnen.
 */
export async function getExerciseProgress(
  db: DB,
  userId: string,
  exerciseId: string,
  limit = 20,
): Promise<ProgressPoint[]> {
  const rows = await db.all<ProgressPoint>(sql`
    SELECT wl.date                                   AS date,
           MAX(sl.weight_kg)                         AS top_kg,
           COALESCE(SUM(sl.reps * sl.weight_kg), 0)  AS volume,
           COUNT(sl.id)                              AS sets,
           (SELECT s2.reps
              FROM set_logs s2
             WHERE s2.workout_log_id = wl.id
               AND s2.exercise_id = ${exerciseId}
               AND s2.completed = 1
             ORDER BY s2.weight_kg DESC, s2.reps DESC
             LIMIT 1)                                AS top_reps
    FROM set_logs sl
    JOIN workout_logs wl ON wl.id = sl.workout_log_id
    WHERE sl.exercise_id = ${exerciseId} AND sl.completed = 1
      AND wl.user_id = ${userId}
    GROUP BY wl.id
    ORDER BY wl.date DESC
    LIMIT ${limit}
  `);
  return rows.reverse();
}

export type PersonalBest = { weight_kg: number; reps: number; date: number };

/** Schwerster jemals abgehakter Satz dieser Übung (Tie-Break: mehr Wdh.). */
export async function getPersonalBest(
  db: DB,
  userId: string,
  exerciseId: string,
): Promise<PersonalBest | null> {
  const [row] = await db.all<PersonalBest>(sql`
    SELECT sl.weight_kg, sl.reps, wl.date
    FROM set_logs sl
    JOIN workout_logs wl ON wl.id = sl.workout_log_id
    WHERE sl.exercise_id = ${exerciseId} AND sl.completed = 1 AND sl.weight_kg > 0
      AND wl.user_id = ${userId}
    ORDER BY sl.weight_kg DESC, sl.reps DESC
    LIMIT 1
  `);
  return row ?? null;
}
