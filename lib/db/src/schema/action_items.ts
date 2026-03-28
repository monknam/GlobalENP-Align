import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { surveyCyclesTable } from "./surveys";
import { usersTable } from "./users";

export const actionItemCategoryEnum = ["company_wide", "team_leader", "management", "executive"] as const;
export const actionItemPriorityEnum = ["high", "medium", "low"] as const;
export const actionItemStatusEnum = ["todo", "in_progress", "done"] as const;

export const actionItemsTable = pgTable("action_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  surveyCycleId: uuid("survey_cycle_id").references(() => surveyCyclesTable.id, { onDelete: "cascade" }),
  category: text("category", { enum: actionItemCategoryEnum }).notNull().default("company_wide"),
  title: text("title").notNull(),
  description: text("description"),
  owner: text("owner"),
  priority: text("priority", { enum: actionItemPriorityEnum }).notNull().default("medium"),
  status: text("status", { enum: actionItemStatusEnum }).notNull().default("todo"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ActionItem = typeof actionItemsTable.$inferSelect;
export type InsertActionItem = typeof actionItemsTable.$inferInsert;
