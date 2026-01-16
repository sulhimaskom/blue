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
// Platform Event Types
// ========================================

export interface BlueprintEventData {
  id: string;
  projectId: string;
  projectName: string;
  contentMarkdown: string;
  structuredData: unknown;
  version: number;
  userId: number;
}

export interface ProjectEventData {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  userId: number;
  timestamp: number;
}

export interface ProjectUpdatedEventData extends ProjectEventData {
  updatedFields: string[];
}

export interface ProjectDeletedEventData {
  projectId: string;
  projectName: string;
  userId: number;
  timestamp: number;
  deletedAt: string;
}

export interface PlatformWebhookEvent extends WebhookEventBase {
  type:
    | "blueprint.created"
    | "blueprint.updated"
    | "project.created"
    | "project.updated"
    | "project.deleted"
    | "project.deployed"
    | "credits.consumed"
    | "webhook.failed";
  data: BlueprintEventData | 
    ProjectEventData |
    ProjectUpdatedEventData |
    ProjectDeletedEventData |
    {
      projectId: string;
      projectName: string;
      deploymentUrl?: string;
      status: string;
      userId: number;
    } | {
      userId: number;
      creditsConsumed: number;
      creditsRemaining: number;
      threshold: number;
    } | {
      webhookConfigurationId: string;
      eventType: string;
      errorMessage: string;
      retryCount: number;
    };
}

// ========================================
// Webhook Event Union Types
// ========================================

// ========================================
// GitHub Webhook Event Types
// ========================================

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url?: string;
  type: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  owner: GitHubUser;
  created_at: string;
  updated_at: string;
}

export interface GitHubCommit {
  id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
    username?: string;
  };
  url: string;
  distinct: boolean;
}

export interface GitHubPushEventData {
  ref: string;
  ref_type?: string;
  repository: GitHubRepository;
  pusher: {
    name: string;
    email: string;
  };
  sender: GitHubUser;
  created?: boolean;
  deleted?: boolean;
  forced?: boolean;
  before?: string;
  after?: string;
  commits?: GitHubCommit[];
  compare?: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  html_url: string;
  user: GitHubUser;
  head: {
    sha: string;
    ref: string;
    repo: GitHubRepository;
  };
  base: {
    sha: string;
    ref: string;
    repo: GitHubRepository;
  };
  created_at: string;
  updated_at: string;
  merged_at?: string;
  merged?: boolean;
}

export interface GitHubPullRequestEventData {
  action: "opened" | "closed" | "reopened" | "edited" | "synchronize";
  number: number;
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
  sender: GitHubUser;
  changes?: unknown;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  user: GitHubUser;
  body?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}

export interface GitHubIssueEventData {
  action: "opened" | "closed" | "reopened" | "edited" | "labeled" | "unlabeled";
  issue: GitHubIssue;
  repository: GitHubRepository;
  sender: GitHubUser;
  changes?: unknown;
}

export interface GitHubWebhookEvent extends WebhookEventBase {
  type:
    | "push"
    | "repository.created"
    | "repository.deleted"
    | "repository.renamed"
    | "pull_request"
    | "pull_request_review"
    | "issues"
    | "issue_comment"
    | "ping";
  data:
    | GitHubPushEventData
    | GitHubPullRequestEventData
    | GitHubIssueEventData
    | {
      zen?: string;
      hook_id?: number;
      repository?: GitHubRepository;
      sender?: GitHubUser;
    };
}

// ========================================
// Webhook Event Union Types
// ========================================

export type WebhookEvent = ClerkWebhookEvent | StripeWebhookEvent | PlatformWebhookEvent | GitHubWebhookEvent;

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



// ========================================
// Platform Event Type Guards  
// ========================================

export function isPlatformWebhookEvent(
  event: WebhookEvent,
): event is PlatformWebhookEvent {
  return (
    event.type.startsWith("blueprint.") ||
    event.type.startsWith("project.") ||
    event.type.startsWith("credits.") ||
    event.type.startsWith("webhook.")
  );
}

export function isBlueprintCreated(
  event: WebhookEvent,
): event is PlatformWebhookEvent & {
  data: BlueprintEventData;
} {
  return event.type === "blueprint.created";
}

export function isBlueprintUpdated(
  event: WebhookEvent,
): event is PlatformWebhookEvent & {
  data: BlueprintEventData;
} {
  return event.type === "blueprint.updated";
}

export function isProjectCreated(
  event: WebhookEvent,
): event is PlatformWebhookEvent & {
  data: ProjectEventData;
} {
  return event.type === "project.created";
}

export function isProjectUpdated(
  event: WebhookEvent,
): event is PlatformWebhookEvent & {
  data: ProjectUpdatedEventData;
} {
  return event.type === "project.updated";
}

export function isProjectDeleted(
  event: WebhookEvent,
): event is PlatformWebhookEvent & {
  data: ProjectDeletedEventData;
} {
  return event.type === "project.deleted";
}

export function isProjectDeployed(
  event: WebhookEvent,
): event is PlatformWebhookEvent & {
  data: { projectId: string; projectName: string; deploymentUrl?: string; status: string; userId: number };
} {
  return event.type === "project.deployed";
}

export function isCreditsConsumed(
  event: WebhookEvent,
): event is PlatformWebhookEvent & {
  data: { userId: number; creditsConsumed: number; creditsRemaining: number; threshold: number };
} {
  return event.type === "credits.consumed";
}

export function isWebhookFailed(
  event: WebhookEvent,
): event is PlatformWebhookEvent & {
  data: { webhookConfigurationId: string; eventType: string; errorMessage: string; retryCount: number };
} {
  return event.type === "webhook.failed";
}

// ========================================
// GitHub Webhook Event Type Guards
// ========================================

export function isGitHubWebhookEvent(
  event: WebhookEvent,
): event is GitHubWebhookEvent {
  return (
    event.type === "push" ||
    event.type === "repository.created" ||
    event.type === "repository.deleted" ||
    event.type === "repository.renamed" ||
    event.type === "pull_request" ||
    event.type === "pull_request_review" ||
    event.type === "issues" ||
    event.type === "issue_comment" ||
    event.type === "ping"
  );
}

export function isGitHubPushEvent(
  event: WebhookEvent,
): event is GitHubWebhookEvent & {
  data: GitHubPushEventData;
} {
  return event.type === "push";
}

export function isGitHubPullRequestEvent(
  event: WebhookEvent,
): event is GitHubWebhookEvent & {
  data: GitHubPullRequestEventData;
} {
  return event.type === "pull_request";
}

export function isGitHubIssuesEvent(
  event: WebhookEvent,
): event is GitHubWebhookEvent & {
  data: GitHubIssueEventData;
} {
  return event.type === "issues";
}

export function isGitHubRepositoryCreated(
  event: WebhookEvent,
): event is GitHubWebhookEvent & {
  data: { repository: GitHubRepository; sender: GitHubUser };
} {
  return event.type === "repository.created";
}

export function isGitHubPing(
  event: WebhookEvent,
): event is GitHubWebhookEvent & {
  data: { zen?: string; hook_id?: number; repository?: GitHubRepository; sender?: GitHubUser };
} {
  return event.type === "ping";
}
