ALTER TABLE "profiles" ADD COLUMN "avatar_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "charge_codes" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_charge_codes_level" ON "charge_codes" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_charge_codes_owner" ON "charge_codes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_charge_codes_approver" ON "charge_codes" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "idx_timesheets_user_status" ON "timesheets" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_timesheet_entries_date" ON "timesheet_entries" USING btree ("date");