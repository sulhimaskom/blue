/**
 * Centralized Rate Limiting Configuration
 *
 * Defines rate limiting policies for all API endpoints following integration engineering best practices:
 * - Consistent patterns across all endpoints
 * - Protection from overload
 * - Tier-based limits for different user levels
 * - Self-documenting configuration
 */

import { RateLimiter } from "@/lib/api-utils";

// =============================================================================
// RATE LIMIT CATEGORIES
// =============================================================================

export type RateLimitCategory =
  | "strict" // Expensive operations (AI generation, deployment)
  | "moderate" // Write operations that consume resources
  | "standard" // Read operations with caching
  | "permissive" // Public health/metrics endpoints
  | "webhook"; // Incoming webhook processing

export interface RateLimitConfig {
  category: RateLimitCategory;
  maxRequests: number;
  windowMs: number;
  description: string;
}

// =============================================================================
// RATE LIMIT POLICIES
// =============================================================================

/**
 * Rate limit policies by category
 *
 * **Strict**: 3 requests per minute - AI generation, deployment
 * **Moderate**: 10 requests per minute - Write operations
 * **Standard**: 30 requests per minute - Read operations
 * **Permissive**: 60 requests per minute - Public endpoints
 * **Webhook**: 100 requests per minute - Incoming webhooks
 */
export const RATE_LIMIT_POLICIES: Record<RateLimitCategory, RateLimitConfig> = {
  strict: {
    category: "strict",
    maxRequests: 3,
    windowMs: 60 * 1000, // 1 minute
    description: "Expensive operations (AI generation, deployment)",
  },
  moderate: {
    category: "moderate",
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    description: "Write operations that consume resources",
  },
  standard: {
    category: "standard",
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    description: "Read operations with caching",
  },
  permissive: {
    category: "permissive",
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    description: "Public health/metrics endpoints",
  },
  webhook: {
    category: "webhook",
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    description: "Incoming webhook processing",
  },
};

// =============================================================================
// SUBSCRIPTION TIER OVERRIDES
// =============================================================================

/**
 * Subscription tier multipliers for rate limits
 * Free: 1x (base limits)
 * Pro: 5x (5x base limits)
 * Enterprise: 10x (10x base limits)
 */
export const TIER_MULTIPLIERS: Record<string, number> = {
  free: 1,
  pro: 5,
  enterprise: 10,
};

// =============================================================================
// ENDPOINT RATE LIMIT MAPPING
// =============================================================================

/**
 * Rate limit configuration for specific endpoints
 * Maps API routes to their appropriate rate limit category
 */
export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitCategory> = {
  // Blueprint management
  "POST /blueprints": "strict", // AI generation is expensive
  "GET /blueprints": "standard", // Read with caching
  "GET /blueprints/[id]": "standard",
  "PUT /blueprints/[id]": "moderate",

  // Deployment
  "POST /deploy/[id]": "strict", // GitHub deployment is expensive

  // Credits
  "POST /credits": "moderate", // Payment processing
  "GET /credits": "standard", // Read with caching

  // Enterprise themes
  "POST /enterprise/themes": "moderate",
  "GET /enterprise/themes": "standard",
  "GET /enterprise/themes/[id]": "standard",
  "PUT /enterprise/themes/[id]": "moderate",
  "DELETE /enterprise/themes/[id]": "moderate",
  "POST /enterprise/themes/[customerId]/activate": "moderate",

  // Performance monitoring
  "GET /performance": "standard",
  "GET /performance/ai-cache-optimization": "standard",
  "GET /performance/optimization": "standard",
  "GET /performance/predictive-optimization": "standard",
  "GET /performance/predictive": "standard",

  // Webhooks
  "POST /webhooks/clerk": "webhook",
  "POST /webhooks/stripe": "webhook",
  "POST /webhooks/monitor": "moderate", // Admin operation
  "GET /webhooks/monitor": "standard",

  // Cache management
  "GET /cache/metrics": "standard",
  "GET /cache/enhanced-metrics": "standard",

  // Circuit breakers
  "GET /circuit-breakers/metrics": "standard",
  "POST /circuit-breakers/reset": "moderate",

  // System endpoints
  "GET /health": "permissive",
  "GET /metrics": "permissive",

  // Projects
  "GET /projects/[id]/blueprints": "standard",

  // Validation
  "POST /validate": "standard",
};

// =============================================================================
// CRITICAL ENDPOINTS - FAIL-CLOSED WHEN REDIS UNAVAILABLE
// =============================================================================

/**
 * Critical endpoints that should fail-closed when Redis is unavailable
 * These endpoints handle sensitive operations: payments, authentication, deployments
 * When Redis fails, these endpoints return 503 instead of allowing unlimited access
 */
export const CRITICAL_ENDPOINTS: string[] = [
  "/credits", // Payment processing
  "/subscription", // Subscription management
  "/deploy", // GitHub deployments
  "/webhooks/stripe", // Payment webhooks
  "/webhooks/clerk", // Authentication webhooks
];

/**
 * Check if an endpoint is critical (should fail-closed)
 *
 * @param endpoint - The endpoint path to check
 * @returns true if the endpoint is critical
 */
export function isCriticalEndpoint(endpoint: string): boolean {
  return CRITICAL_ENDPOINTS.some(
    (critical) => endpoint.includes(critical) || endpoint.startsWith(critical)
  );
}

// =============================================================================
// RATE LIMITER FACTORY
// =============================================================================

/**
 * Get a rate limiter for a specific category
 *
 * @param category - Rate limit category
 * @param subscriptionTier - User's subscription tier (optional)
 * @param failClosed - If true, deny requests when Redis fails (for critical endpoints)
 * @returns Configured rate limiter function
 */
export function getRateLimiter(
  category: RateLimitCategory,
  subscriptionTier: string = "free",
  failClosed: boolean = false,
) {
  const policy = RATE_LIMIT_POLICIES[category];
  const multiplier = TIER_MULTIPLIERS[subscriptionTier] || 1;
  const adjustedMaxRequests = policy.maxRequests * multiplier;

  return RateLimiter(adjustedMaxRequests, policy.windowMs, failClosed);
}

/**
 * Get rate limiter for a specific endpoint
 *
 * @param endpoint - API endpoint (e.g., "POST /blueprints")
 * @param subscriptionTier - User's subscription tier (optional)
 * @param failClosed - Override automatic critical endpoint detection
 * @returns Configured rate limiter function
 */
export function getEndpointRateLimiter(
  endpoint: string,
  subscriptionTier: string = "free",
  failClosed?: boolean,
) {
  const category = ENDPOINT_RATE_LIMITS[endpoint] || "standard";
  // Auto-detect failClosed based on endpoint criticality if not explicitly set
  const shouldFailClosed = failClosed ?? isCriticalEndpoint(endpoint);
  return getRateLimiter(category, subscriptionTier, shouldFailClosed);
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Pre-configured rate limiters for common categories
 * Includes fail-closed versions for critical endpoints
 */
export const RateLimiters = {
  strict: () => getRateLimiter("strict"),
  moderate: () => getRateLimiter("moderate"),
  standard: () => getRateLimiter("standard"),
  permissive: () => getRateLimiter("permissive"),
  webhook: () => getRateLimiter("webhook"),

  // Fail-closed versions for critical endpoints
  strictFailClosed: () => getRateLimiter("strict", "free", true),
  moderateFailClosed: () => getRateLimiter("moderate", "free", true),

  // Tier-aware rate limiters - accepts subscription tier parameter
  forTier: (tier: string = "free", category: RateLimitCategory = "standard") =>
    getRateLimiter(category, tier),

  // Endpoint-specific limiters (free tier defaults)
  blueprintsPost: () => getRateLimiter("strict"),
  blueprintsGet: () => getRateLimiter("standard"),
  deployPost: () => getRateLimiter("strict", "free", true), // Critical - fail-closed
  creditsPost: () => getRateLimiter("moderate", "free", true), // Critical - fail-closed
  creditsGet: () => getRateLimiter("standard"),
  themesPost: () => getRateLimiter("moderate"),
  themesGet: () => getRateLimiter("standard"),
  performanceGet: () => getRateLimiter("standard"),
  webhooksGet: () => getRateLimiter("webhook"),
  metricsGet: () => getRateLimiter("permissive"),
  healthGet: () => getRateLimiter("permissive"),
};

// =============================================================================
// RATE LIMIT METRICS
// =============================================================================

/**
 * Rate limit metrics for monitoring
 */
export interface RateLimitMetrics {
  endpoint: string;
  category: RateLimitCategory;
  maxRequests: number;
  windowMs: number;
  requestsUsed: number;
  requestsRemaining: number;
  resetTime: number;
  tierMultiplier: number;
}

/**
 * Calculate rate limit metrics for an endpoint
 *
 * @param endpoint - API endpoint
 * @param subscriptionTier - User's subscription tier
 * @param requestsUsed - Number of requests used in current window
 * @returns Rate limit metrics
 */
export function calculateRateLimitMetrics(
  endpoint: string,
  subscriptionTier: string = "free",
  requestsUsed: number = 0,
): RateLimitMetrics {
  const category = ENDPOINT_RATE_LIMITS[endpoint] || "standard";
  const policy = RATE_LIMIT_POLICIES[category];
  const tierMultiplier = TIER_MULTIPLIERS[subscriptionTier] || 1;
  const maxRequests = policy.maxRequests * tierMultiplier;
  const now = Date.now();

  return {
    endpoint,
    category,
    maxRequests,
    windowMs: policy.windowMs,
    requestsUsed,
    requestsRemaining: Math.max(0, maxRequests - requestsUsed),
    resetTime: now + policy.windowMs,
    tierMultiplier,
  };
}
