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
