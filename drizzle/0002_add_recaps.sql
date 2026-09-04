CREATE TABLE `recaps` (
	`id` text PRIMARY KEY NOT NULL,
	`week_key` text NOT NULL,
	`year` integer NOT NULL,
	`week` integer NOT NULL,
	`headline` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`highlights_json` text DEFAULT '[]' NOT NULL,
	`tip` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recaps_week_key` ON `recaps` (`week_key`);