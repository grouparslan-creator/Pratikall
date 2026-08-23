CREATE TABLE `user_preferences` (
	`user_key` text PRIMARY KEY NOT NULL,
	`owner_name` text NOT NULL,
	`app_name` text NOT NULL,
	`company_name` text DEFAULT '' NOT NULL,
	`theme` text DEFAULT 'red' NOT NULL,
	`enabled_modules` text DEFAULT 'overview,accounts,cards,loans,calendar,reports' NOT NULL,
	`default_reminder_days` integer DEFAULT 3 NOT NULL,
	`logo_key` text DEFAULT '' NOT NULL,
	`use_default_logo` integer DEFAULT true NOT NULL,
	`email_sender_name` text DEFAULT '' NOT NULL,
	`email_reply_to` text DEFAULT '' NOT NULL,
	`email_signature` text DEFAULT '' NOT NULL,
	`setup_completed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `account_notifications` ADD `provider_result` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `account_notifications` ADD `error_message` text DEFAULT '' NOT NULL;