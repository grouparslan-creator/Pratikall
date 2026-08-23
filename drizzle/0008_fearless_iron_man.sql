CREATE TABLE `reminder_email_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`reminder_id` text NOT NULL,
	`user_key` text NOT NULL,
	`recipient_email` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`provider_id` text DEFAULT '' NOT NULL,
	`error_message` text DEFAULT '' NOT NULL,
	`attempted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_email_deliveries_reminder_id_unique` ON `reminder_email_deliveries` (`reminder_id`);--> statement-breakpoint
CREATE INDEX `reminder_email_delivery_status_idx` ON `reminder_email_deliveries` (`status`,`attempted_at`);