CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`original_amount` integer NOT NULL,
	`planned_payment_method` text NOT NULL,
	`due_date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`paid_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
