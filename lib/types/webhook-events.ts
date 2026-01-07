/**
 * Centralized TypeScript interfaces for webhook events
 *
 * Eliminates `any` type violations in webhook routes
 * Follows blueprint.md principle 8.3 ("no-explicit-any is strictly enforced")
 */

// ========================================
// Shared Webhook Types
// ========================================

export interface WebhookContext {
  requestId: string;
}

export interface WebhookEventBase {
  id: string;
  type: string;
  created: number;
  data: unknown;
}

// ========================================
// Clerk Webhook Event Types
// ========================================

export interface ClerkEmail {
  id: string;
  email_address: string;
  verification?: {
    status: "verified" | "unverified" | "expired";
    strategy?: string;
  };
}

export interface ClerkUserEventData {
  id: string;
  email_addresses: ClerkEmail[];
  first_name?: string;
  last_name?: string;
  username?: string;
  primary_email_address_id?: string;
  created_at: number;
  updated_at: number;
}

export interface ClerkWebhookEvent extends WebhookEventBase {
  type:
    | "user.created"
    | "user.deleted"
    | "user.updated"
    | "user.email.created"
    | "user.email.verified"
    | "email.created";
  data: {
    id: string;
    object: "event";
    // User data varies by event type
    email_addresses?: ClerkEmail[];
    first_name?: string;
    last_name?: string;
    username?: string;
    primary_email_address_id?: string;
    [key: string]: unknown;
  };
}

// ========================================
// Stripe Webhook Event Types
// ========================================

export interface StripeMetadata {
  userId?: string;
  creditsAdded?: string;
  projectId?: string;
  [key: string]: string | undefined;
}

export interface StripePaymentIntentObject {
  id: string;
  object: "payment_intent";
  amount: number;
  currency: string;
  status: string;
  metadata: StripeMetadata;
  created: number;
  customer?: string;
  description?: string;
}

export interface StripeInvoiceObject {
  id: string;
  object: "invoice";
  amount_paid: number;
  currency: string;
  status: string;
  subscription?: string;
  created: number;
  metadata: StripeMetadata;
  customer?: string;
}

export interface StripePaymentIntentWebhookData {
  object: string;
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata: StripeMetadata;
  created: number;
}

export interface StripeInvoiceWebhookData {
  object: string;
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  subscription?: string;
  created: number;
  metadata: StripeMetadata;
}

export interface StripeWebhookEvent extends WebhookEventBase {
  type:
    | "payment_intent.succeeded"
    | "payment_intent.payment_failed"
    | "invoice.payment_succeeded"
    | "invoice.payment_failed"
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted";
  data: {
    object: StripePaymentIntentObject | StripeInvoiceObject;
    previous_attributes?: unknown;
  };
}

// ========================================
// Webhook Event Union Types
// ========================================

export type WebhookEvent = ClerkWebhookEvent | StripeWebhookEvent;

export function isClerkWebhookEvent(
  event: WebhookEvent,
): event is ClerkWebhookEvent {
  return event.type.startsWith("user.") || event.type.startsWith("email.");
}

export function isStripeWebhookEvent(
  event: WebhookEvent,
): event is StripeWebhookEvent {
  return (
    event.type.startsWith("payment_intent.") ||
    event.type.startsWith("invoice.") ||
    event.type.startsWith("customer.subscription.")
  );
}

export function isStripePaymentIntentSucceeded(
  event: WebhookEvent,
): event is StripeWebhookEvent & {
  data: { object: StripePaymentIntentObject };
} {
  return event.type === "payment_intent.succeeded";
}

export function isStripeInvoicePaymentSucceeded(
  event: WebhookEvent,
): event is StripeWebhookEvent & {
  data: { object: StripeInvoiceObject };
} {
  return event.type === "invoice.payment_succeeded";
}

export function isClerkUserCreated(
  event: WebhookEvent,
): event is ClerkWebhookEvent & {
  data: { id: string; email_addresses: ClerkEmail[] };
} {
  return event.type === "user.created";
}

export function isClerkUserDeleted(
  event: WebhookEvent,
): event is ClerkWebhookEvent & {
  data: { id: string };
} {
  return event.type === "user.deleted";
}

export function isClerkUserUpdated(
  event: WebhookEvent,
): event is ClerkWebhookEvent & {
  data: { id: string; email_addresses: ClerkEmail[] };
} {
  return event.type === "user.updated";
}
