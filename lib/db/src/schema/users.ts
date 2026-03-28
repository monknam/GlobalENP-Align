import { pgTable, text, boolean, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { departmentsTable } from "./departments";

export const appRoleEnum = ["admin", "leader", "member"] as const;
export const employmentStatusEnum = ["active", "inactive", "leave"] as const;
export const employeeGroupEnum = ["dev", "non_dev", "management"] as const;

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name"),
  employeeNo: text("employee_no").unique(),
  role: text("role", { enum: appRoleEnum }).notNull().default("member"),
  departmentId: uuid("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  employmentStatus: text("employment_status", { enum: employmentStatusEnum }).notNull().default("active"),
  jobTitle: text("job_title"),
  joinedOn: date("joined_on"),
  employeeGroup: text("employee_group", { enum: employeeGroupEnum }),
  isSystemAdmin: boolean("is_system_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
