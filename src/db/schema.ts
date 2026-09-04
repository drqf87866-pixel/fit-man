import { sql, relations } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Alle IDs sind TEXT (UUID bzw. sprechender Slug bei Seed-Daten).
 * Grund: Für den transaktionalen Batch-Insert am Workout-Ende muss die ID des
 * workout_logs bereits bekannt sein, bevor die set_logs geschrieben werden.
 * Mit AUTOINCREMENT ginge das nur über einen zweiten Roundtrip.
 */

// ---------------------------------------------------------------------------
// exercises – Übungsbibliothek (Standard + eigene Übungen)
// ---------------------------------------------------------------------------
export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** Muskelgruppe / Kategorie, z. B. "Brust", "Rücken", "Beine" */
    category: text('category').notNull(),
    /** Konkreter Zielmuskel, z. B. "Pectoralis major" */
    targetMuscle: text('target_muscle').notNull().default(''),
    /** Bewegungsmuster (push/pull/core/cardio) für Filter und Badges, siehe lib/tags.ts */
    movement: text('movement').notNull().default(''),
    /** Freihantel/Maschine/Körpergewicht-Tag */
    equipment: text('equipment').notNull().default(''),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('idx_exercises_category').on(t.category)],
);

// ---------------------------------------------------------------------------
// workout_plans – Trainingspläne
// ---------------------------------------------------------------------------
export const workoutPlans = sqliteTable('workout_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// plan_exercises – Übungen eines Plans inkl. Reihenfolge
// ---------------------------------------------------------------------------
export const planExercises = sqliteTable(
  'plan_exercises',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id')
      .notNull()
      .references(() => workoutPlans.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    /** Spalte heißt `sort_order`, weil `order` in SQL reserviert ist. */
    order: integer('sort_order').notNull().default(0),
    targetSets: integer('target_sets').notNull().default(3),
  },
  (t) => [index('idx_plan_exercises_plan').on(t.planId, t.order)],
);

// ---------------------------------------------------------------------------
// workout_logs – absolvierte Trainingseinheiten
// ---------------------------------------------------------------------------
export const workoutLogs = sqliteTable(
  'workout_logs',
  {
    id: text('id').primaryKey(),
    /** optional: Freies Training ("Schnellstart") hat keinen Plan */
    planId: text('plan_id').references(() => workoutPlans.id, { onDelete: 'set null' }),
    /** Snapshot des Plannamens – bleibt erhalten, wenn der Plan gelöscht wird */
    planName: text('plan_name').notNull().default('Freies Training'),
    date: integer('date', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    notes: text('notes').notNull().default(''),
  },
  (t) => [index('idx_workout_logs_date').on(t.date)],
);

// ---------------------------------------------------------------------------
// set_logs – einzelne Sätze einer Trainingseinheit
// ---------------------------------------------------------------------------
export const setLogs = sqliteTable(
  'set_logs',
  {
    id: text('id').primaryKey(),
    workoutLogId: text('workout_log_id')
      .notNull()
      .references(() => workoutLogs.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    setNumber: integer('set_number').notNull(),
    reps: integer('reps').notNull().default(0),
    weightKg: real('weight_kg').notNull().default(0),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    index('idx_set_logs_workout').on(t.workoutLogId),
    index('idx_set_logs_exercise').on(t.exerciseId),
  ],
);

// ---------------------------------------------------------------------------
// Relations (für die Drizzle Query-API)
// ---------------------------------------------------------------------------
export const workoutPlansRelations = relations(workoutPlans, ({ many }) => ({
  planExercises: many(planExercises),
  workoutLogs: many(workoutLogs),
}));

export const planExercisesRelations = relations(planExercises, ({ one }) => ({
  plan: one(workoutPlans, { fields: [planExercises.planId], references: [workoutPlans.id] }),
  exercise: one(exercises, { fields: [planExercises.exerciseId], references: [exercises.id] }),
}));

export const workoutLogsRelations = relations(workoutLogs, ({ one, many }) => ({
  plan: one(workoutPlans, { fields: [workoutLogs.planId], references: [workoutPlans.id] }),
  setLogs: many(setLogs),
}));

export const setLogsRelations = relations(setLogs, ({ one }) => ({
  workoutLog: one(workoutLogs, {
    fields: [setLogs.workoutLogId],
    references: [workoutLogs.id],
  }),
  exercise: one(exercises, { fields: [setLogs.exerciseId], references: [exercises.id] }),
}));

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type PlanExercise = typeof planExercises.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type SetLog = typeof setLogs.$inferSelect;
