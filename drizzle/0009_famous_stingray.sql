CREATE TABLE `analytics_daily` (
	`date` text PRIMARY KEY NOT NULL,
	`page_views` integer DEFAULT 0 NOT NULL,
	`unique_visitors` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_unique_visitors` (
	`date` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_unique_date_hash_unique` ON `analytics_unique_visitors` (`date`,`visitor_hash`);--> statement-breakpoint
CREATE INDEX `analytics_unique_date_idx` ON `analytics_unique_visitors` (`date`);--> statement-breakpoint
CREATE INDEX `analytics_unique_hash_idx` ON `analytics_unique_visitors` (`visitor_hash`);