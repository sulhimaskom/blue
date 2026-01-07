/**
 * Webhook Type Definitions
 *
 * This file provides type-safe interfaces for webhook events from external services.
 * All webhook handlers should use these interfaces instead of `any` type.
 *
 * @see app/api/webhooks/stripe/route.ts
 * @see app/api/webhooks/clerk/route.ts
 */

// ============================================================================
// STRIPE WEBHOOK TYPES
// ============================================================================

/**
 * Stripe webhook event data object
 * Contains the actual data payload for each event type
 */
export interface StripeEventDataObject {
  id: string;
  object: string;
  amount: number;
  currency: string;
  metadata?: {
    userId?: string;
    creditsAdded?: string;
    [key: string]: string | undefined;
  };
  subscription?: string;
  payment_intent?: string;
  invoice?: string;
  [key: string]: any;
}

/**
 * Complete Stripe webhook event structure
 */
export interface StripeWebhookEvent {
  id: string;
  object: "event";
  api_version: string;
  created: number;
  data: {
    object: StripeEventDataObject;
    previous_attributes?: any;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: StripeEventType;
}

/**
 * All supported Stripe event types
 */
export type StripeEventType =
  | "payment_intent.succeeded"
  | "payment_intent.failed"
  | "invoice.payment_succeeded"
  | "invoice.payment_failed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "checkout.session.completed";

/**
 * Payment intent succeeded event data
 */
export interface StripePaymentIntentSucceeded {
  id: string;
  object: "event";
  type: "payment_intent.succeeded";
  data: {
    object: {
      id: string;
      object: "payment_intent";
      amount: number;
      currency: string;
      metadata: {
        userId: string;
        creditsAdded: string;
      };
    };
  };
}

/**
 * Invoice payment succeeded event data
 */
export interface StripeInvoicePaymentSucceeded {
  id: string;
  object: "event";
  type: "invoice.payment_succeeded";
  data: {
    object: {
      id: string;
      object: "invoice";
      subscription?: string;
      payment_intent?: string;
    };
  };
}

// ============================================================================
// CLERK WEBHOOK TYPES
// ============================================================================

/**
 * Clerk email address structure
 */
export interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification: {
    status: "verified" | "unverified" | "expired";
    strategy: string;
  };
}

/**
 * Clerk webhook event data for user operations
 */
export interface ClerkUserData {
  id: string;
  object: "user";
  email_addresses: ClerkEmailAddress[];
  first_name?: string;
  last_name?: string;
  username?: string;
  created_at: number;
  updated_at: number;
}

/**
 * Complete Clerk webhook event structure
 */
export interface ClerkWebhookEvent {
  id: string;
  object: "event";
  type: ClerkEventType;
  created_at: number;
  data: ClerkUserData;
}

/**
 * All supported Clerk event types
 */
export type ClerkEventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "email.created"
  | "email.updated"
  | "email.deleted";

/**
 * User created event data
 */
export interface ClerkUserCreatedEvent {
  id: string;
  object: "event";
  type: "user.created";
  created_at: number;
  data: {
    id: string;
    object: "user";
    email_addresses: ClerkEmailAddress[];
  };
}

/**
 * User deleted event data
 */
export interface ClerkUserDeletedEvent {
  id: string;
  object: "event";
  type: "user.deleted";
  created_at: number;
  data: {
    id: string;
    object: "user";
    email_addresses: ClerkEmailAddress[];
  };
}

/**
 * User updated event data
 */
export interface ClerkUserUpdatedEvent {
  id: string;
  object: "event";
  type: "user.updated";
  created_at: number;
  data: {
    id: string;
    object: "user";
    email_addresses: ClerkEmailAddress[];
  };
}

// ============================================================================
// PERFORMANCE MONITORING TYPES
// ============================================================================

/**
 * Performance metrics data structure
 */
export interface PerformanceMetrics {
  performance: {
    score: number;
    alertCount: number;
    alerts: PerformanceAlert[];
  };
  bundle: {
    totalSize: number;
    gzippedSize: number;
  };
  compression: {
    compressionRatePercent: number;
    bandwidthSavedKB: number;
  };
  optimization?: {
    quickWins: string[];
  };
  timestamp: number;
}

/**
 * Performance alert structure
 */
export interface PerformanceAlert {
  type: "critical" | "warning" | "info";
  message: string;
  impact: string;
  recommendation?: string;
  severity: "high" | "medium" | "low";
  autoResolvable: boolean;
  // Additional fields from API response
  metric?: string;
  value: number;
  threshold: number;
}

/**
 * Calculated performance metrics for dashboard display
 */
export interface DashboardPerformanceMetrics {
  performanceScore: number;
  bundleSizeKB: number;
  bundleSizeGzippedKB: number;
  compressionRate: number;
  bandwidthSavedKB: number;
  alertCount: number;
  timestamp: number;
  alerts: PerformanceAlert[];
  quickWins: string[];
}

// ============================================================================
// WEBHOOK CONTEXT TYPES
// ============================================================================

/**
 * Webhook processing context
 */
export interface WebhookContext {
  requestId: string;
  timestamp: number;
  serviceName: string;
  retryCount?: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for Stripe webhook events
 */
export function isStripeWebhookEvent(
  event: unknown,
): event is StripeWebhookEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "object" in event &&
    (event as { object: unknown }).object === "event" &&
    "type" in event &&
    "data" in event &&
    typeof (event as { data: unknown }).data === "object"
  );
}

/**
 * Type guard for Clerk webhook events
 */
export function isClerkWebhookEvent(
  event: unknown,
): event is ClerkWebhookEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "object" in event &&
    (event as { object: unknown }).object === "event" &&
    "type" in event &&
    "created_at" in event &&
    "data" in event
  );
}

/**
 * Type guard for performance metrics
 */
export function isPerformanceMetrics(
  data: unknown,
): data is PerformanceMetrics {
  return (
    typeof data === "object" &&
    data !== null &&
    "performance" in data &&
    "bundle" in data &&
    "compression" in data &&
    "timestamp" in data
  );
}
