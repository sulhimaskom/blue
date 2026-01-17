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
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Teams table for team management
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: integer("owner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  subscriptionTier: text("subscription_tier").default("free").notNull(), // free, pro, enterprise
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Team members table for role-based access control
export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // admin, member, viewer
  invitedBy: integer("invited_by")
    .references(() => users.id, { onDelete: "set null" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Team projects table for managing project access within teams
export const teamProjects = pgTable("team_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // admin, member, viewer - project-specific role
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Deployments table for tracking multiple environments
export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  environment: text("environment").notNull(), // production, staging, preview
  githubRepoId: integer("github_repo_id"),
  githubRepoUrl: text("github_repo_url"),
  githubRepoName: text("github_repo_name"),
  githubOrg: text("github_org"),
  blueprintVersion: integer("blueprint_version").notNull(),
  status: text("status").default("pending").notNull(), // pending, deploying, deployed, failed, deleted
  deploymentLogs: jsonb("deployment_logs"),
  expiresAt: timestamp("expires_at"), // For preview environments
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Blueprint shares table for sharing blueprints with users and teams
// Note: At least one of sharedWithUser or sharedWithTeam must be non-null (enforced by service layer)
export const blueprintShares = pgTable("blueprint_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  blueprintId: uuid("blueprint_id")
    .references(() => blueprints.id, { onDelete: "cascade" })
    .notNull(),
  sharedBy: integer("shared_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sharedWithUser: integer("shared_with_user")
    .references(() => users.id, { onDelete: "cascade" }),
  sharedWithTeam: uuid("shared_with_team")
    .references(() => teams.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(), // view, edit, fork, admin
  expiresAt: timestamp("expires_at"),
  viewCount: integer("view_count").default(0).notNull(),
  lastViewedAt: timestamp("last_viewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blueprint share audit logs table for access tracking and compliance
export const blueprintShareAuditLogs = pgTable("blueprint_share_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  blueprintId: uuid("blueprint_id").notNull(),
  shareId: uuid("share_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  permissionLevel: text("permission_level"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  amount: integer("amount").notNull(),
  creditsAdded: integer("credits_added"),
  stripePaymentId: text("stripe_payment_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Webhook configurations table
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

// Webhook event history table
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

// Webhook subscriptions table for event filtering
export const webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookConfigurationId: uuid("webhook_configuration_id")
    .references(() => webhookConfigurations.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(),
  filterExpression: text("filter_expression"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Blueprint = typeof blueprints.$inferSelect;
export type NewBlueprint = typeof blueprints.$inferInsert;
export type BlueprintShare = typeof blueprintShares.$inferSelect;
export type NewBlueprintShare = typeof blueprintShares.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type WebhookConfiguration = typeof webhookConfigurations.$inferSelect;
export type NewWebhookConfiguration = typeof webhookConfigurations.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type NewWebhookSubscription = typeof webhookSubscriptions.$inferInsert;

// Subscription plans table for tier configurations
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  tier: text("tier").unique().notNull(), // free, pro, enterprise
  maxCredits: integer("max_credits").notNull(), // Maximum credits that can be stored
  monthlyCreditAllowance: integer("monthly_credit_allowance").notNull(), // Credits granted monthly
  apiRateLimitMultiplier: integer("api_rate_limit_multiplier").default(1).notNull(), // Multiplier for base rate limits
  maxProjects: integer("max_projects").notNull(), // Maximum projects allowed (-1 for unlimited)
  maxTeams: integer("max_teams").notNull(), // Maximum teams allowed (-1 for unlimited)
  maxWebhooks: integer("max_webhooks").notNull(), // Maximum webhooks allowed (-1 for unlimited)
  features: jsonb("features").notNull(), // JSON object with feature flags
  priceMonthly: integer("price_monthly").default(0).notNull(), // Price in cents
  priceYearly: integer("price_yearly").default(0).notNull(), // Price in cents
  stripePriceId: text("stripe_price_id"), // Stripe price ID for monthly
  stripePriceIdYearly: text("stripe_price_id_yearly"), // Stripe price ID for yearly
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription usage tracking table
export const subscriptionUsage = pgTable("subscription_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  period: text("period").notNull(), // YYYY-MM format for monthly tracking
  creditsUsed: integer("credits_used").default(0).notNull(),
  creditsGranted: integer("credits_granted").default(0).notNull(),
  projectsCreated: integer("projects_created").default(0).notNull(),
  teamsCreated: integer("teams_created").default(0).notNull(),
  webhooksCreated: integer("webhooks_created").default(0).notNull(),
  apiRequests: integer("api_requests").default(0).notNull(),
  lastResetAt: timestamp("last_reset_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team-related types
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type TeamProject = typeof teamProjects.$inferSelect;
export type NewTeamProject = typeof teamProjects.$inferInsert;

// Activity logs table for tracking user and system events
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  clerkId: text("clerk_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Subscription-related types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SubscriptionUsage = typeof subscriptionUsage.$inferSelect;
export type NewSubscriptionUsage = typeof subscriptionUsage.$inferInsert;

// User settings table for personalization
export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  notificationPreferences: jsonb("notification_preferences").notNull(),
  theme: text("theme").default("system").notNull(),
  language: text("language").default("en").notNull(),
  timezone: text("timezone").default("UTC").notNull(),
  defaultProjectVisibility: text("default_project_visibility").default("private").notNull(),
  defaultBlueprintPricingPackage: text("default_blueprint_pricing_package").default("standard").notNull(),
  uiPreferences: jsonb("ui_preferences").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Activity log types
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

// Notifications table for in-app notification system
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(), // blueprint_complete, team_invitation, deployment_status, credit_warning, blueprint_shared
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"), // Additional data specific to notification type
  link: text("link"), // URL to navigate when clicked
  readAt: timestamp("read_at"), // Null if unread
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notification types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// User settings types
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
