import { pgTable, text, boolean, timestamp, uuid, integer, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { departmentsTable } from "./departments";
import { usersTable } from "./users";

export const surveyCycleStatusEnum = ["draft", "active", "closed", "archived"] as const;
export const questionTypeEnum = ["likert_5", "short_text", "long_text"] as const;

export const surveyCyclesTable = pgTable("survey_cycles", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  year: integer("year").notNull(),
  quarter: integer("quarter"),
  status: text("status", { enum: surveyCycleStatusEnum }).notNull().default("draft"),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  anonymousMinCount: integer("anonymous_min_count").notNull().default(5),
  introTitle: text("intro_title"),
  introPurpose: text("intro_purpose"),
  introDirection: text("intro_direction"),
  introBackground: text("intro_background"),
  introConfidentiality: text("intro_confidentiality"),
  introGuide: text("intro_guide"),
  createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const surveySectionsTable = pgTable("survey_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  surveyCycleId: uuid("survey_cycle_id").notNull().references(() => surveyCyclesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const surveyQuestionsTable = pgTable("survey_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  surveySectionId: uuid("survey_section_id").notNull().references(() => surveySectionsTable.id, { onDelete: "cascade" }),
  questionNo: integer("question_no"),
  questionText: text("question_text").notNull(),
  questionType: text("question_type", { enum: questionTypeEnum }).notNull().default("likert_5"),
  isRequired: boolean("is_required").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const surveyResponsesTable = pgTable("survey_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  surveyCycleId: uuid("survey_cycle_id").notNull().references(() => surveyCyclesTable.id, { onDelete: "cascade" }),
  respondentUserId: uuid("respondent_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  respondentDepartmentId: uuid("respondent_department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  isSubmitted: boolean("is_submitted").notNull().default(false),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const surveyAnswersTable = pgTable("survey_answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  surveyResponseId: uuid("survey_response_id").notNull().references(() => surveyResponsesTable.id, { onDelete: "cascade" }),
  surveyQuestionId: uuid("survey_question_id").notNull().references(() => surveyQuestionsTable.id, { onDelete: "cascade" }),
  numericValue: integer("numeric_value"),
  textValue: text("text_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSurveyCycleSchema = createInsertSchema(surveyCyclesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSurveySectionSchema = createInsertSchema(surveySectionsTable).omit({ id: true, createdAt: true });
export const insertSurveyQuestionSchema = createInsertSchema(surveyQuestionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSurveyResponseSchema = createInsertSchema(surveyResponsesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSurveyAnswerSchema = createInsertSchema(surveyAnswersTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertSurveyCycle = z.infer<typeof insertSurveyCycleSchema>;
export type SurveyCycle = typeof surveyCyclesTable.$inferSelect;
export type SurveySection = typeof surveySectionsTable.$inferSelect;
export type SurveyQuestion = typeof surveyQuestionsTable.$inferSelect;
export type SurveyResponse = typeof surveyResponsesTable.$inferSelect;
export type SurveyAnswer = typeof surveyAnswersTable.$inferSelect;
