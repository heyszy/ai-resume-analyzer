CREATE TYPE "public"."candidate_processing_status" AS ENUM('uploaded', 'parsing', 'extracting', 'scoring', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('pending_review', 'screening_passed', 'interviewing', 'hired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."job_description_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "candidate_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"basic_info" jsonb NOT NULL,
	"education_history" jsonb NOT NULL,
	"work_experiences" jsonb NOT NULL,
	"skill_tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"project_experiences" jsonb NOT NULL,
	"source_text" text DEFAULT '' NOT NULL,
	"cleaned_text" text DEFAULT '' NOT NULL,
	"extraction_notes" text DEFAULT '' NOT NULL,
	"extracted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"jd_id" uuid NOT NULL,
	"total_score" integer NOT NULL,
	"skill_match_score" integer NOT NULL,
	"experience_relevance_score" integer NOT NULL,
	"education_fit_score" integer NOT NULL,
	"ai_commentary" text NOT NULL,
	"score_details" jsonb NOT NULL,
	"is_stale" boolean DEFAULT false NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"email" text,
	"phone" text,
	"city" text,
	"original_file_name" text NOT NULL,
	"original_file_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"status" "candidate_status" DEFAULT 'pending_review' NOT NULL,
	"processing_status" "candidate_processing_status" DEFAULT 'uploaded' NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error_code" text,
	"processing_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_descriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"required_skills" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"bonus_skills" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_scores" ADD CONSTRAINT "candidate_scores_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_scores" ADD CONSTRAINT "candidate_scores_jd_id_job_descriptions_id_fk" FOREIGN KEY ("jd_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_profiles_candidate_id_uidx" ON "candidate_profiles" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "candidate_scores_candidate_id_idx" ON "candidate_scores" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "candidate_scores_jd_id_idx" ON "candidate_scores" USING btree ("jd_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_scores_candidate_jd_uidx" ON "candidate_scores" USING btree ("candidate_id","jd_id");--> statement-breakpoint
CREATE INDEX "candidates_status_idx" ON "candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "candidates_processing_status_idx" ON "candidates" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "candidates_uploaded_at_idx" ON "candidates" USING btree ("uploaded_at");
