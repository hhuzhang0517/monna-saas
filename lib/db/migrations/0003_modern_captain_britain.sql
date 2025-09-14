CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"type" varchar(20) DEFAULT 'image' NOT NULL,
	"prompt" text NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"result_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
