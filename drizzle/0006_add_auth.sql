CREATE TABLE `login_attempts` (
	`email` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
DROP INDEX `idx_recaps_week_key`;--> statement-breakpoint
ALTER TABLE `recaps` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recaps_user_week` ON `recaps` (`user_id`,`week_key`);--> statement-breakpoint
ALTER TABLE `ai_requests` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `workout_logs` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `idx_workout_logs_user_date` ON `workout_logs` (`user_id`,`date`);--> statement-breakpoint
ALTER TABLE `workout_plans` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `idx_workout_plans_user_created` ON `workout_plans` (`user_id`,`created_at`);