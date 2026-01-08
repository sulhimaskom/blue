import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  serial,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").unique().notNull(),
  email: text("email").notNull(),
  credits: integer("credits").default(0).notNull(),
  subscriptionTier: text("subscription_tier").default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: integer("owner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("draft").notNull(),
  repoUrl: text("repo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const blueprints = pgTable("blueprints", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  version: integer("version").notNull(),
  contentMarkdown: text("content_markdown").notNull(),
  structuredData: jsonb("structured_data").notNull(),
  marketResearch: jsonb("market_research"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  amount: integer("amount").notNull(),
  creditsAdded: integer("credits_added"),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const webhookConfigurations = pgTable("webhook_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  eventTypes: jsonb("event_types").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  retryCount: integer("retry_count").default(3).notNull(),
  timeoutSeconds: integer("timeout_seconds").default(30).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookConfigurationId: uuid("webhook_configuration_id")
    .references(() => webhookConfigurations.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull(), // pending, success, failed, retrying
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  attemptCount: integer("attempt_count").default(0).notNull(),
  nextRetryAt: timestamp("next_retry_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Blueprint = typeof blueprints.$inferSelect;
export type NewBlueprint = typeof blueprints.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type WebhookConfiguration = typeof webhookConfigurations.$inferSelect;
export type NewWebhookConfiguration = typeof webhookConfigurations.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
