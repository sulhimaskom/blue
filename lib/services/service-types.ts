/**
 * Centralized Service Layer Type Definitions
 *
 * This file consolidates all type definitions used across the service layer,
 * following the Service Layer principle from blueprint.md:208-209.
 *
 * Benefits:
 * - Single source of truth for all service types
 * - Eliminates type duplication across services
 * - Improves maintainability and consistency
 * - Enhances type safety across the service layer
 * - Supports atomic modularity and reusability
 */

// =============================================================================
// CORE STATUS TYPES
// =============================================================================

/**
 * Universal status type for system health, service status, and UI indicators
 * Used across monitoring services, components, and APIs
 */
export type StatusType = "healthy" | "degraded" | "unhealthy" | "unknown";

// =============================================================================
// MONITORING & HEALTH TYPES
// =============================================================================

export interface SystemHealth {
  status: StatusType;
  timestamp: string;
  uptime: number;
  checks: Array<{
    service: string;
    status: StatusType;
    responseTime?: number;
    error?: string;
  }>;
}

export interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  unit: string;
}

export interface MetricsData {
  metrics: string[];
  summaries: Record<string, MetricSummary>;
  recent: Array<{
    name: string;
    value: number;
    unit: string;
    timestamp: string;
  }>;
  timestamp: string;
}

export interface MonitoringData {
  health: SystemHealth | null;
  metrics: MetricsData | null;
}

export interface MonitoringServiceOptions {
  detailed?: boolean;
  timeout?: number;
}

// =============================================================================
// MONITORING DASHBOARD TYPES
// =============================================================================

export interface HealthScoreMetrics {
  score: number;
  healthyServices: number;
  totalServices: number;
  statusText: string;
}

export interface ServiceStatusData {
  name: string;
  status: StatusType;
  responseTime?: number;
  error?: string;
  lastChecked: Date;
  isLive: boolean;
}

export interface FormattedServiceData {
  name: string;
  label: string;
  value: string | number;
  unit?: string;
  badge?: string;
  status?: string;
}

// =============================================================================
// AI SERVICE TYPES
// =============================================================================

export interface AIModel {
  id: string;
  name: string;
  type: "reasoning" | "fast";
  maxTokens: number;
}

export interface AICompletionRequest {
  prompt: string;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  context?: string[];
}

export interface AICompletionResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ResearchRequest {
  query: string;
  maxResults?: number;
  includeImages?: boolean;
}

export interface ResearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
  }>;
  answer: string;
}

export interface AIPattern {
  type:
    | "error"
    | "success"
    | "anomaly"
    | "marketplace"
    | "ecommerce"
    | "social"
    | "dashboard"
    | "api-service"
    | "mobile-app"
    | "fintech"
    | "healthcare"
    | "edtech"
    | "realestate"
    | "logistics"
    | "saas";
  description: string;
  timestamp: string;
  confidence: number;
  metadata?: Record<string, any>;
}

// =============================================================================
// GITHUB SERVICE TYPES
// =============================================================================

export interface GitHubRepoConfig {
  org: string;
  name: string;
  description: string;
  isPrivate: boolean;
  blueprintContent: string;
}

export interface GitHubCreateRepoResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  private: boolean;
  created_at: string;
}

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId?: string;
}

export interface BranchInfo {
  name: string;
  url: string;
  sha: string;
  createdAt: string;
}

// =============================================================================
// CACHE SERVICE TYPES
// =============================================================================

export interface CacheConfig {
  ttl: number;
  tags?: string[];
  priority?: "low" | "normal" | "high";
  compress?: boolean;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictions: number;
  size: number;
  maxAge: number;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

// =============================================================================
// PERFORMANCE MONITORING TYPES
// =============================================================================

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface DatabasePerformanceMetrics {
  connectionPool: {
    active: number;
    idle: number;
    total: number;
    max: number;
  };
  queryStats: {
    slowQueries: number;
    averageTime: number;
    failedQueries: number;
  };
  cacheHitRate: number;
}

// =============================================================================
// ADVANCED PERFORMANCE DASHBOARD TYPES
// =============================================================================

/**
 * Comprehensive advanced performance metrics data structure containing system,
 * application, and database performance indicators with timestamp tracking.
 */
export interface AdvancedPerformanceMetrics {
  timestamp: string;
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskIOPS: number;
    networkLatency: number;
  };
  application: {
    averageResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    throughput: number;
  };
  database: {
    connectionPool: number;
    queryTime: number;
    slowQueries: number;
    cacheHitRate: number;
  };
}

/**
 * AI-powered cache optimization metrics containing optimization recommendations
 * with estimated cost savings and confidence scoring.
 */
export interface AICacheOptimizationMetrics {
  timestamp: string;
  optimizations: Array<{
    type: string;
    description: string;
    estimatedSavings: number;
    confidence: number;
    applied: boolean;
  }>;
  summary: {
    totalSavings: number;
    appliedOptimizations: number;
    pendingOptimizations: number;
    hitRateImprovement: number;
  };
}

/**
 * Predictive performance analytics data containing future performance predictions
 * with confidence scoring and actionable recommendations.
 */
export interface PredictivePerformanceData {
  timestamp: string;
  predictions: Array<{
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    timeframe: string;
    severity: "low" | "medium" | "high";
    recommendations: string[];
  }>;
  summary: {
    totalPredictions: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

export interface APIErrorResponse {
  message: string;
  type?: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export interface ServiceError {
  name: string;
  message: string;
  statusCode?: number;
  response?: APIErrorResponse;
  timestamp: string;
  service?: string;
  context?: Record<string, unknown>;
}

export interface CircuitBreakerState {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount: number;
  successCount: number;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  isAvailable: boolean;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

// =============================================================================
// USER SERVICE TYPES
// =============================================================================

export interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  credits: number;
  subscriptionTier: "free" | "pro" | "enterprise";
  createdAt: string;
  lastActiveAt: string;
}

export interface UserMetrics {
  projectsCreated: number;
  blueprintsGenerated: number;
  creditsUsed: number;
  lastActivity: string;
}

// =============================================================================
// WEBHOOK SERVICE TYPES
// =============================================================================

export interface ClerkWebhookPayload {
  object: string;
  type: string;
  data: {
    id: string;
    object?: string;
    email_addresses?: Array<{
      email_address: string;
      verification: { status: string };
    }>;
    first_name?: string;
    last_name?: string;
  };
}

export interface StripeWebhookPayload {
  id: string;
  object: string;
  api_version: string;
  created: number;
  data: {
    object: {
      id: string;
      object: string;
      amount?: number;
      currency?: string;
      customer?: string;
      status?: string;
      subscription?: string;
    };
  };
  type: string;
}

export interface GitHubWebhookPayload {
  action: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
    private: boolean;
  };
  sender: {
    login: string;
    id: number;
  };
}

export interface WebhookEvent<
  T = ClerkWebhookPayload | StripeWebhookPayload | GitHubWebhookPayload,
> {
  id: string;
  type: string;
  source: "clerk" | "stripe" | "github";
  data: T;
  timestamp: string;
  signature?: string;
}

export interface WebhookProcessingResult<T = unknown> {
  success: boolean;
  processed: boolean;
  response?: T;
  error?: string;
  duration: number;
}

// =============================================================================
// BLUEPRINT ENGINE TYPES
// =============================================================================

export interface BlueprintRequest {
  idea: string;
  context?: string;
  userId: string;
  researchEnabled?: boolean;
}

export interface BlueprintResponse {
  id: string;
  title: string;
  content: string;
  research?: ResearchResult;
  metadata: {
    generatedAt: string;
    processingTime: number;
    version: number;
  };
}

export interface BlueprintVersion {
  id: string;
  projectId: string;
  version: number;
  contentMarkdown: string;
  structuredData: Record<string, unknown>;
  marketResearch?: ResearchResult;
  createdAt: string;
}

// =============================================================================
// COMMON SERVICE TYPES
// =============================================================================

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: {
    duration: number;
    requestId: string;
    cacheHit?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextPage?: number;
    prevPage?: number;
  };
}

export interface QueryFilter {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "in"
    | "nin"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "like"
    | "ilike";
  value: string | number | boolean | Array<string | number>;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  sort?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  pagination?: PaginationParams;
  search?: string;
}

// =============================================================================
// REACT HOOK TYPES (for service integration)
// =============================================================================

export interface UseServiceOptions<T = any> {
  autoFetch?: boolean;
  refreshInterval?: number;
  immediate?: boolean;
  params?: T;
}

export interface UseServiceReturn<T = any, E = Error> {
  data: T | null;
  loading: boolean;
  error: E | null;
  refetch: () => Promise<void>;
  mutate?: () => Promise<void>;
  isValidating: boolean;
}

export interface UseMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  detailed?: boolean;
}

export interface UseMonitoringReturn {
  health: SystemHealth | null;
  metrics: MetricsData | null;
  loading: boolean;
  autoRefresh: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refreshData: () => Promise<void>;
  setAutoRefresh: (_value: boolean) => void;
}

// =============================================================================
// TYPE GUARDS & VALIDATORS
// =============================================================================

export function isSystemHealth(obj: any): obj is SystemHealth {
  return (
    obj &&
    typeof obj.status === "string" &&
    ["healthy", "degraded", "unhealthy"].includes(obj.status) &&
    typeof obj.timestamp === "string" &&
    typeof obj.uptime === "number" &&
    Array.isArray(obj.checks)
  );
}

export function isServiceError(obj: any): obj is ServiceError {
  return (
    obj &&
    typeof obj.name === "string" &&
    typeof obj.message === "string" &&
    typeof obj.timestamp === "string"
  );
}

export function isCircuitBreakerState(obj: any): obj is CircuitBreakerState {
  return (
    obj &&
    typeof obj.state === "string" &&
    ["CLOSED", "OPEN", "HALF_OPEN"].includes(obj.state) &&
    typeof obj.failureCount === "number" &&
    typeof obj.successCount === "number" &&
    typeof obj.isAvailable === "boolean"
  );
}

// =============================================================================
// ENTERPRISE THEME TYPES
// =============================================================================

/**
 * Enterprise Theme Statistics
 * Business logic output for theme dashboard analytics
 */
export interface EnterpriseThemeStats {
  totalThemes: number;
  activeThemes: number;
  enterpriseCustomers: number;
  customizationRate: number;
}

/**
 * Service result wrapper for consistent error handling
 */
export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// ALL TYPES ARE ALREADY EXPORTED ABOVE FOR CONVENIENT IMPORTING
// =============================================================================
