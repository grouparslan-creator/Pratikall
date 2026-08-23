CREATE TABLE `memberships` (
	`user_key` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'personal' NOT NULL,
	`plan` text DEFAULT 'trial' NOT NULL,
	`status` text DEFAULT 'trialing' NOT NULL,
	`trial_started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`trial_ends_at` text NOT NULL,
	`email_reminders` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `memberships_status_idx` ON `memberships` (`status`,`trial_ends_at`);
