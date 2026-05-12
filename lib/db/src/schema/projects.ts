import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  recommended_agent: z.string(),
  tech_stack_rules: z.string(),
  win_condition: z.string(),
  deliverables: z.array(z.string()),
  dependencies: z.array(z.string()),
});

export const projectStateSchema = z.object({
  goal: z.string(),
  outline: z.array(z.string()),
  sessions: z.array(projectSessionSchema),
  obsidian_markdown: z.string(),
});

export type ProjectSession = z.infer<typeof projectSessionSchema>;
export type ProjectState = z.infer<typeof projectStateSchema>;

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("New Project"),
  projectState: jsonb("project_state")
    .$type<ProjectState>()
    .notNull()
    .default({
      goal: "",
      outline: [],
      sessions: [],
      obsidian_markdown: "",
    }),
  completedSessions: jsonb("completed_sessions")
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectMessagesTable = pgTable("project_messages", {
  id: serial("id").primaryKey(),
  projectId: serial("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertProjectMessageSchema = createInsertSchema(
  projectMessagesTable,
).omit({ id: true, createdAt: true });

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
export type ProjectMessage = typeof projectMessagesTable.$inferSelect;
