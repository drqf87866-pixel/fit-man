CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`target_muscle` text DEFAULT '' NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_exercises_category` ON `exercises` (`category`);--> statement-breakpoint
CREATE TABLE `plan_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`target_sets` integer DEFAULT 3 NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `workout_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_plan_exercises_plan` ON `plan_exercises` (`plan_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `set_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_log_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`weight_kg` real DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`workout_log_id`) REFERENCES `workout_logs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_set_logs_workout` ON `set_logs` (`workout_log_id`);--> statement-breakpoint
CREATE INDEX `idx_set_logs_exercise` ON `set_logs` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text,
	`plan_name` text DEFAULT 'Freies Training' NOT NULL,
	`date` integer DEFAULT (unixepoch()) NOT NULL,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `workout_plans`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_workout_logs_date` ON `workout_logs` (`date`);--> statement-breakpoint
CREATE TABLE `workout_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
