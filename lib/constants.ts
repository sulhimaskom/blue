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
