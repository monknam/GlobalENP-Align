import { pgTable, text, boolean, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { departmentsTable } from "./departments";
import { appRoleEnum, employmentStatusEnum, employeeGroupEnum } from "./users";

export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").unique(),
  fullName: text("full_name"),
  role: text("role", { enum: appRoleEnum }).notNull().default("member"),
  departmentId: uuid("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  departmentName: text("department_name"),
  employmentStatus: text("employment_status", { enum: employmentStatusEnum }).default("active"),
  jobTitle: text("job_title"),
  joinedOn: date("joined_on"),
  employeeGroup: text("employee_group", { enum: employeeGroupEnum }),
  isSystemAdmin: boolean("is_system_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
