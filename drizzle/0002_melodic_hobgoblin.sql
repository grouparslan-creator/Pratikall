CREATE TABLE `account_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`event_type` text NOT NULL,
	`channels` text NOT NULL,
	`recipient_phone` text DEFAULT '' NOT NULL,
	`recipient_email` text DEFAULT '' NOT NULL,
	`message` text NOT NULL,
	`delivery_mode` text DEFAULT 'device' NOT NULL,
	`status` text DEFAULT 'prepared' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD `email` text DEFAULT '' NOT NULL;