ALTER TABLE "submissions" DROP CONSTRAINT "submissions_builder_id_builders_id_fk";
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "is_visible" boolean DEFAULT false NOT NULL;