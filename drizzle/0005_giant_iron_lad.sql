CREATE TABLE `support_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`report_type` text NOT NULL,
	`subject` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`page` text DEFAULT '' NOT NULL,
	`technical_message` text DEFAULT '' NOT NULL,
	`is_automatic` integer DEFAULT false NOT NULL,
	`central_status` text DEFAULT 'pending' NOT NULL,
	`email_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
