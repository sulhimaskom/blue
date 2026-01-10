/**
 * Application-wide constants
 * Following the blueprint principle of "NO HARDCODED STRINGS"
 */

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

// Project statuses
export const PROJECT_STATUSES = {
  DRAFT: "draft",
  GENERATING: "generating",
  COMPLETED: "completed",
  DEPLOYED: "deployed",
} as const;

// Blueprint versions
export const BLUEPRINT_VERSIONS = {
  CURRENT: "1.0.0",
} as const;

// Rate limits by subscription tier
export const RATE_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: {
    DAILY_PROJECTS: 3,
    TOKENS_PER_PROJECT: 1000,
  },
  [SUBSCRIPTION_TIERS.PRO]: {
    DAILY_PROJECTS: 50,
    TOKENS_PER_PROJECT: 5000,
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    DAILY_PROJECTS: 1000,
    TOKENS_PER_PROJECT: 10000,
  },
} as const;

// Cost per additional token (in cents)
export const PRICING = {
  ADDITIONAL_TOKEN: 1, // 1 cent per token
} as const;

// AI timeouts (in milliseconds)
export const AI_TIMEOUTS = {
  REASONING: 60000, // 60 seconds
  SEARCH: 30000, // 30 seconds
  GENERATION: 120000, // 2 minutes
} as const;

// Database query timeouts (in milliseconds)
export const DB_TIMEOUTS = {
  SHORT: 5000, // 5 seconds
  MEDIUM: 15000, // 15 seconds
  LONG: 30000, // 30 seconds
} as const;

// Intelligent Prefetch Service timeouts (in milliseconds)
export const PREFETCH_TIMEOUTS = {
  STRATEGY_EVALUATION: 30000, // 30 seconds - evaluate prefetch strategies
  COMPREHENSIVE_PREFETCH: 300000, // 5 minutes - comprehensive prefetch cycle
  STAGGERED_EXECUTION: 100, // 100ms per priority level - execution staggering
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// UI constants
export const UI = {
  LOADERS: {
    MIN_DURATION: 500, // minimum ms to show loading states
  },
  FORMS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  },
} as const;

// Webhook event constants
export const WEBHOOK_EVENTS = {
  CLERK: {
    USER_CREATED: "user.created",
    USER_DELETED: "user.deleted",
    USER_UPDATED: "user.updated",
  } as const,

  STRIPE: {
    PAYMENT_INTENT_SUCCEEDED: "payment_intent.succeeded",
    INVOICE_PAYMENT_SUCCEEDED: "invoice.payment_succeeded",
  } as const,
} as const;

// API error message constants
export const API_ERROR_MESSAGES = {
  GENERIC_ERROR: "An unexpected error occurred. Please try again.",
  INVALID_REQUEST: "Invalid request format.",
  INSUFFICIENT_CREDITS: "Insufficient credits. Please upgrade your plan.",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please try again later.",
  UNAUTHORIZED: "Authentication required.",
  FORBIDDEN: "Access denied.",
  NOT_FOUND: "Resource not found.",
  VALIDATION_ERROR: "Input validation failed.",
  DATABASE_ERROR: "Database operation failed.",
  WEBHOOK_PROCESSING_FAILED: "Webhook processing failed.",
  INVALID_WEBHOOK_SIGNATURE: "Invalid webhook signature.",
} as const;

// Credit system constants
export const CREDIT_RULES = {
  SIGNUP_BONUS: 5,
  CONVERSION_RATE: 10, // $1 = 10 credits (1 credit = $0.10)
  BLUEPRINT_COST: 1,
  PRO_THRESHOLD: 500, // Credits needed for pro tier
  MINIMUM_PURCHASE: 100, // $1.00 minimum in cents
  MAXIMUM_PURCHASE: 100000, // $1000.00 maximum in cents
} as const;

// Pricing packages constants
export interface PricingPackage {
  credits: number;
  price: string;
}

export const PRICING_PACKAGES: PricingPackage[] = [
  { credits: 10, price: "$1.00" },
  { credits: 50, price: "$5.00" },
  { credits: 100, price: "$10.00" },
  { credits: 500, price: "$50.00 (Pro tier)" },
];

// Homepage content constants moved to UI_TEXT system for complete centralization
// Previously defined here, now available in lib/constants/ui-text.ts as UI_TEXT.homepage
