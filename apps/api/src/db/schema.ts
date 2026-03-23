import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  bigint as pgBigint,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const candidateStatusEnum = pgEnum("candidate_status", [
  "pending_review",
  "screening_passed",
  "interviewing",
  "hired",
  "rejected",
]);

export const candidateProcessingStatusEnum = pgEnum("candidate_processing_status", [
  "uploaded",
  "parsing",
  "extracting",
  "scoring",
  "ready",
  "failed",
]);

export const jobDescriptionStatusEnum = pgEnum("job_description_status", ["active", "archived"]);

// 岗位需求表，保存 JD 原文、技能条件和启用状态。
export const jobDescriptions = pgTable("job_descriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requiredSkills: text("required_skills").array().notNull().default(sql`ARRAY[]::text[]`),
  bonusSkills: text("bonus_skills").array().notNull().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

// 候选人主表，保存简历文件、基础展示信息和处理状态。
export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull().default(""),
    email: text("email"),
    phone: text("phone"),
    city: text("city"),
    originalFileName: text("original_file_name").notNull(),
    originalFilePath: text("original_file_path").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: pgBigint("file_size", { mode: "number" }).notNull(),
    pageCount: integer("page_count").notNull().default(0),
    status: candidateStatusEnum("status").notNull().default("pending_review"),
    processingStatus: candidateProcessingStatusEnum("processing_status")
      .notNull()
      .default("uploaded"),
    uploadedAt: timestamp("uploaded_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "date",
    }),
    processingErrorCode: text("processing_error_code"),
    processingErrorMessage: text("processing_error_message"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIndex: index("candidates_status_idx").on(table.status),
    processingStatusIndex: index("candidates_processing_status_idx").on(table.processingStatus),
    uploadedAtIndex: index("candidates_uploaded_at_idx").on(table.uploadedAt),
  }),
);

// 候选人结构化资料表，保存 AI 提取结果和人工修正后的档案。
export const candidateProfiles = pgTable(
  "candidate_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    basicInfo: jsonb("basic_info").notNull().$type<{
      name: string | null;
      phone: string | null;
      email: string | null;
      city: string | null;
    }>(),
    educationHistory: jsonb("education_history").notNull().$type<
      Array<{
        school: string | null;
        major: string | null;
        degree: string | null;
        graduationTime: string | null;
      }>
    >(),
    workExperiences: jsonb("work_experiences").notNull().$type<
      Array<{
        companyName: string | null;
        position: string | null;
        timeRange: string | null;
        summary: string | null;
      }>
    >(),
    skillTags: text("skill_tags").array().notNull().default(sql`ARRAY[]::text[]`),
    projectExperiences: jsonb("project_experiences").notNull().$type<
      Array<{
        projectName: string | null;
        techStack: string[];
        responsibilities: string[];
        highlights: string[];
      }>
    >(),
    sourceText: text("source_text").notNull().default(""),
    cleanedText: text("cleaned_text").notNull().default(""),
    extractionNotes: text("extraction_notes").notNull().default(""),
    extractedAt: timestamp("extracted_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    candidateIdUnique: uniqueIndex("candidate_profiles_candidate_id_uidx").on(table.candidateId),
  }),
);

// 候选人对单个 JD 的评分结果，支持重算和过期标记。
export const candidateScores = pgTable(
  "candidate_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    jdId: uuid("jd_id")
      .notNull()
      .references(() => jobDescriptions.id, { onDelete: "cascade" }),
    totalScore: integer("total_score").notNull(),
    skillMatchScore: integer("skill_match_score").notNull(),
    experienceRelevanceScore: integer("experience_relevance_score").notNull(),
    educationFitScore: integer("education_fit_score").notNull(),
    aiCommentary: text("ai_commentary").notNull(),
    scoreDetails: jsonb("score_details").notNull().$type<{
      skillNotes?: string;
      experienceNotes?: string;
      educationNotes?: string;
      matchedSkills?: string[];
      missingSkills?: string[];
    }>(),
    isStale: boolean("is_stale").notNull().default(false),
    scoredAt: timestamp("scored_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    candidateIdIndex: index("candidate_scores_candidate_id_idx").on(table.candidateId),
    jdIdIndex: index("candidate_scores_jd_id_idx").on(table.jdId),
    candidateJdUnique: uniqueIndex("candidate_scores_candidate_jd_uidx").on(
      table.candidateId,
      table.jdId,
    ),
  }),
);

export const databaseTables = {
  candidates,
  candidateProfiles,
  candidateScores,
  jobDescriptions,
};
