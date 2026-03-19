CREATE TYPE "public"."user_role" AS ENUM('employee', 'charge_manager', 'pmo', 'finance', 'admin');--> statement-breakpoint
CREATE TYPE "public"."charge_code_level" AS ENUM('program', 'project', 'activity', 'task');--> statement-breakpoint
CREATE TYPE "public"."timesheet_status" AS ENUM('draft', 'submitted', 'manager_approved', 'cc_approved', 'locked', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."approval_action" AS ENUM('approve', 'reject');--> statement-breakpoint
CREATE TYPE "public"."approval_type" AS ENUM('manager', 'charge_code');--> statement-breakpoint
CREATE TYPE "public"."vacation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('timesheet_reminder', 'approval_reminder', 'manager_summary', 'weekly_insights');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"job_grade" varchar(50),
	"manager_id" uuid,
	"role" "user_role" DEFAULT 'employee' NOT NULL,
	"department" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_grade" varchar(50) NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"billing_rate" numeric(10, 2),
	"effective_from" date NOT NULL,
	"effective_to" date
);
--> statement-breakpoint
CREATE TABLE "charge_codes" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" varchar(50),
	"path" varchar(1000),
	"level" charge_code_level,
	"program_name" varchar(255),
	"cost_center" varchar(100),
	"activity_category" varchar(100),
	"budget_amount" numeric(12, 2),
	"owner_id" uuid,
	"approver_id" uuid,
	"valid_from" date,
	"valid_to" date,
	"is_billable" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charge_code_users" (
	"charge_code_id" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "charge_code_users_charge_code_id_user_id_pk" PRIMARY KEY("charge_code_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "timesheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" timesheet_status DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"locked_at" timestamp,
	"rejection_comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timesheet_id" uuid NOT NULL,
	"charge_code_id" varchar(50) NOT NULL,
	"date" date NOT NULL,
	"hours" numeric(4, 2) NOT NULL,
	"description" text,
	"calculated_cost" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timesheet_id" uuid NOT NULL,
	"approver_id" uuid NOT NULL,
	"action" "approval_action" NOT NULL,
	"comment" text,
	"approved_at" timestamp DEFAULT now() NOT NULL,
	"approval_type" "approval_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"charge_code_id" varchar(50) PRIMARY KEY NOT NULL,
	"budget_amount" numeric(12, 2),
	"actual_spent" numeric(12, 2) DEFAULT '0',
	"forecast_at_completion" numeric(12, 2),
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"is_weekend" boolean DEFAULT false,
	"is_holiday" boolean DEFAULT false,
	"holiday_name" varchar(255),
	"country_code" varchar(2) DEFAULT 'TH',
	CONSTRAINT "calendar_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "vacation_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"vacation_status" "vacation_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" varchar(500) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_type" NOT NULL,
	"recipient_id" uuid NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_manager_id_profiles_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_codes" ADD CONSTRAINT "charge_codes_parent_id_charge_codes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."charge_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_codes" ADD CONSTRAINT "charge_codes_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_codes" ADD CONSTRAINT "charge_codes_approver_id_profiles_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_code_users" ADD CONSTRAINT "charge_code_users_charge_code_id_charge_codes_id_fk" FOREIGN KEY ("charge_code_id") REFERENCES "public"."charge_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_code_users" ADD CONSTRAINT "charge_code_users_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_charge_code_id_charge_codes_id_fk" FOREIGN KEY ("charge_code_id") REFERENCES "public"."charge_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_approver_id_profiles_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_charge_code_id_charge_codes_id_fk" FOREIGN KEY ("charge_code_id") REFERENCES "public"."charge_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;