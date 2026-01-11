import { z } from "zod";

export const webhookConfigurationSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  url: z.string().url("Must be a valid URL"),
  secret: z.string().min(32, "Secret must be at least 32 characters"),
  eventTypes: z
    .array(z.string())
    .min(1, "At least one event type must be selected"),
  isActive: z.boolean().default(true),
  retryCount: z.number().int().min(0).max(10).default(3),
  timeoutSeconds: z.number().int().min(5).max(300).default(30),
});

export const webhookTestSchema = z.object({
  eventType: z.string().min(1, "Event type is required"),
  payload: z.record(z.any()).optional(),
});

export const webhookRetrySchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
});

export const webhookSecretRotationSchema = z.object({
  webhookId: z.string().uuid("Invalid webhook ID"),
});

export const webhookConfigurationUpdateSchema = webhookConfigurationSchema
  .partial()
  .omit({
    secret: true,
  });

export type WebhookConfigurationInput = z.infer<
  typeof webhookConfigurationSchema
>;
export type WebhookTestInput = z.infer<typeof webhookTestSchema>;
export type WebhookRetryInput = z.infer<typeof webhookRetrySchema>;
export type WebhookSecretRotationInput = z.infer<
  typeof webhookSecretRotationSchema
>;
export type WebhookConfigurationUpdateInput = z.infer<
  typeof webhookConfigurationUpdateSchema
>;

export const WEBHOOK_EVENT_TYPES = [
  "stripe.payment_intent.succeeded",
  "stripe.payment_intent.payment_failed",
  "stripe.invoice.payment_succeeded",
  "stripe.invoice.payment_failed",
  "clerk.user.created",
  "clerk.user.updated",
  "clerk.user.deleted",
  "clerk.session.created",
  "clerk.session.ended",
  "github.push",
  "github.pull_request.opened",
  "github.pull_request.closed",
  "github.issues.opened",
  "github.issues.closed",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const WEBHOOK_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  RETRYING: "retrying",
} as const;

export type WebhookStatus =
  (typeof WEBHOOK_STATUS)[keyof typeof WEBHOOK_STATUS];

// Webhook subscription schemas
export const webhookSubscriptionCreateSchema = z.object({
  webhookConfigurationId: z.string().uuid("Invalid webhook configuration ID"),
  eventType: z.enum([
    // Platform events
    "blueprint.created",
    "blueprint.updated", 
    "project.deployed",
    "credits.consumed",
    "credit.low_balance",
    "credit.depleted",
    "credit.purchased",
    "credit.usage_spike",
    "credit.renewed",
    "webhook.failed",
    // Performance events
    "performance.api_response_slow",
    "performance.cache_hit_rate_low",
    "performance.circuit_breaker_tripped",
    "performance.database_query_slow",
    "performance.memory_high",
    "performance.error_rate_high",
    "performance.cpu_high",
    "performance.health_score_low",
    // Clerk events
    "user.created",
    "user.updated",
    "user.deleted",
    "user.email.created",
    "user.email.verified",
    "email.created",
    // Stripe events
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ], {
    message: "Invalid event type",
  }),
  filterExpression: z.string().max(255, "Filter expression too long").optional(),
});

export const webhookSubscriptionUpdateSchema = z.object({
  filterExpression: z.string().max(255, "Filter expression too long").optional(),
  isActive: z.boolean().optional(),
});

export type WebhookSubscriptionCreateInput = z.infer<typeof webhookSubscriptionCreateSchema>;
export type WebhookSubscriptionUpdateInput = z.infer<typeof webhookSubscriptionUpdateSchema>;

// Updated webhook event types to include platform events
export const WEBHOOK_EVENT_TYPES_UPDATED = [
  // Platform events
  "blueprint.created",
  "blueprint.updated",
  "project.deployed", 
  "credits.consumed",
  "credit.low_balance",
  "credit.depleted", 
  "credit.purchased",
  "credit.usage_spike",
  "credit.renewed",
  "webhook.failed",
  // Performance events
  "performance.api_response_slow",
  "performance.cache_hit_rate_low",
  "performance.circuit_breaker_tripped",
  "performance.database_query_slow",
  "performance.memory_high",
  "performance.error_rate_high",
  "performance.cpu_high",
  "performance.health_score_low",
  // Clerk events
  "clerk.user.created",
  "clerk.user.updated",
  "clerk.user.deleted",
  "clerk.session.created",
  "clerk.session.ended",
  // Stripe events
  "stripe.payment_intent.succeeded",
  "stripe.payment_intent.payment_failed",
  "stripe.invoice.payment_succeeded",
  "stripe.invoice.payment_failed",
  // GitHub events
  "github.push",
  "github.pull_request.opened",
  "github.pull_request.closed",
  "github.issues.opened",
  "github.issues.closed",
] as const;

export type WebhookEventTypeUpdated = (typeof WEBHOOK_EVENT_TYPES_UPDATED)[number];
