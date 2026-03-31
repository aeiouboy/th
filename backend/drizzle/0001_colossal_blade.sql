CREATE TYPE "public"."leave_type" AS ENUM('full_day', 'half_am', 'half_pm');--> statement-breakpoint
CREATE TYPE "public"."charge_code_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."timesheet_status" ADD VALUE 'approved' BEFORE 'manager_approved';--> statement-breakpoint
CREATE TABLE "company_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" varchar(500) NOT NULL,
	"description" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "charge_code_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"charge_code_id" varchar(50) NOT NULL,
	"reason" text,
	"status" charge_code_request_status DEFAULT 'pending',
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vacation_requests" ADD COLUMN "leave_type" "leave_type" DEFAULT 'full_day' NOT NULL;--> statement-breakpoint
ALTER TABLE "charge_code_requests" ADD CONSTRAINT "charge_code_requests_requester_id_profiles_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_code_requests" ADD CONSTRAINT "charge_code_requests_charge_code_id_charge_codes_id_fk" FOREIGN KEY ("charge_code_id") REFERENCES "public"."charge_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_code_requests" ADD CONSTRAINT "charge_code_requests_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_profiles_manager" ON "profiles" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_department" ON "profiles" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_charge_codes_parent" ON "charge_codes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_timesheets_period" ON "timesheets" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_timesheet_entries_user_date" ON "timesheet_entries" USING btree ("timesheet_id","date");--> statement-breakpoint
CREATE INDEX "idx_timesheet_entries_charge_code" ON "timesheet_entries" USING btree ("charge_code_id");--> statement-breakpoint
ALTER TABLE "cost_rates" DROP COLUMN "billing_rate";