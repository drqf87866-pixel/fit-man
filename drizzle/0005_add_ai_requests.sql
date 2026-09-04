CREATE TABLE `ai_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_requests_created_at` ON `ai_requests` (`created_at`);