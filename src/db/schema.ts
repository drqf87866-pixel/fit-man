import { sql, relations } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Alle IDs sind TEXT (UUID bzw. sprechender Slug bei Seed-Daten).
 * Grund: Für den transaktionalen Batch-Insert am Workout-Ende muss die ID des
 * workout_logs bereits bekannt sein, bevor die set_logs geschrieben werden.
 * Mit AUTOINCREMENT ginge das nur über einen zweiten Roundtrip.
 *
 * Multi-User-Invariante: plan_exercises und set_logs bekommen bewusst KEINE
 * user_id-Spalte – sie sind immer über ihren besessenen Eltern-Datensatz
 * erreicht (plan_exercises -> workout_plans, set_logs -> workout_logs).
 * Jeder Query muss deshalb den Eltern-Join um user_id ergänzen.
 */

// ---------------------------------------------------------------------------
// users – Accounts (E-Mail + Passwort, siehe lib/auth.ts)
// ---------------------------------------------------------------------------
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    /** Normalisiert (trim + lowercase) – UNIQUE schließt Doppelt Konten aus. */
    email: text('email').notNull(),
    /** Format: pbkdf2$<iterations>$<salt_b64>$<hash_b64> (siehe lib/auth.ts) */
    passwordHash: text('password_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('idx_users_email').on(t.email)],
);

// ---------------------------------------------------------------------------
// sessions – Login-Sessions (Cookie-Token, nur der Hash liegt in der DB)
// ---------------------------------------------------------------------------
export const sessions = sqliteTable(
  'sessions',
  {
    /** SHA-256-Hex des Cookie-Tokens – das Token selbst wird nie gespeichert. */
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('idx_sessions_user').on(t.userId)],
);

// ---------------------------------------------------------------------------
// login_attempts – Fixed-Window-Throttle je E-Mail (siehe lib/auth.ts)
// ---------------------------------------------------------------------------
export const loginAttempts = sqliteTable('login_attempts', {
  email: text('email').primaryKey(),
  /** Fensterbeginn in Unix-Sekunden */
  windowStart: integer('window_start').notNull(),
  count: integer('count').notNull(),
});

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
    /**
     * Slug des Vorschaubilds aus free-exercise-db, z. B. "Barbell_Full_Squat".
     * Die Datei liegt unter /img/exercises/<slug>.jpg; leer => Icon-Fallback.
     */
    image: text('image').notNull().default(''),
    /** Kurze Erklärung (2-3 Sätze) für die Detailseite. */
    description: text('description').notNull().default(''),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    /** Owner – nur bei eigenen Übungen gesetzt; NULL = globale Seed-Daten. */
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [index('idx_exercises_category').on(t.category)],
);

// ---------------------------------------------------------------------------
// workout_plans – Trainingspläne
// ---------------------------------------------------------------------------
export const workoutPlans = sqliteTable(
  'workout_plans',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    /** Owner – NULL = Alt-Daten vor der Auth-Umstellung (werden per Backfill zugeordnet). */
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('idx_workout_plans_user_created').on(t.userId, t.createdAt)],
);

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
    /** Owner – NULL = Alt-Daten vor der Auth-Umstellung (werden per Backfill zugeordnet). */
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    date: integer('date', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    notes: text('notes').notNull().default(''),
  },
  (t) => [
    index('idx_workout_logs_date').on(t.date),
    index('idx_workout_logs_user_date').on(t.userId, t.date),
  ],
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
// recaps – gespeicherter KI-Wochen-Rückblick je ISO-Woche
// ---------------------------------------------------------------------------
export const recaps = sqliteTable(
  'recaps',
  {
    id: text('id').primaryKey(),
    /** Schlüssel "2026-35" (ISO-Jahr-KW) – eindeutig je Nutzer und Woche */
    weekKey: text('week_key').notNull(),
    /** Owner – Unique gilt je Nutzer, siehe idx_recaps_user_week unten. */
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    week: integer('week').notNull(),
    /** Einprägsame deutsche Schlagzeile (von Gemini) */
    headline: text('headline').notNull().default(''),
    /** Fließtext-Zusammenfassung (von Gemini) */
    summary: text('summary').notNull().default(''),
    /** JSON-Array von Strings, z. B. '["…","…"]' */
    highlightsJson: text('highlights_json').notNull().default('[]'),
    /** Optionaler 1-Satz-Tipp für die nächste Woche; NULL = keiner */
    tip: text('tip'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('idx_recaps_user_week').on(t.userId, t.weekKey)],
);

// ---------------------------------------------------------------------------
// ai_requests – Zähler für das Gemini-Ratelimit (Free Tier: 15 Anfragen/Minute)
//
// Eine Zeile je tatsächlich abgesetztem Gemini-HTTP-Call (Retries zählen mit!).
// Der Zähler liegt in D1 und nicht im Worker-Speicher, weil jeder Isolate
// seinen eigenen Speicher hat – nur die Datenbank sieht alle Requests.
// ---------------------------------------------------------------------------
export const aiRequests = sqliteTable(
  'ai_requests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Zeitpunkt des Calls in ms seit Epoch (Date.now()) */
    createdAt: integer('created_at').notNull(),
    /** Aufrufer – ohne FK (Hot-Insert-Path); Basis für das Tageslimit je Nutzer. */
    userId: text('user_id'),
  },
  (t) => [index('idx_ai_requests_created_at').on(t.createdAt)],
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
export type Recap = typeof recaps.$inferSelect;
export type NewRecap = typeof recaps.$inferInsert;
export type User = typeof users.$inferSelect;
