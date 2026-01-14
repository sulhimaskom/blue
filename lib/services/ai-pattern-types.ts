/**
 * Shared types for AI pattern detection services
 */

export type AIPatternType =
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

export interface AIPattern {
  type: AIPatternType;
  keywords: string[];
  frequency: number;
  lastSeen: number;
  confidence: number;
  cacheKeys: string[];
}

export interface CacheWarmingRule {
  pattern: AIPatternType;
  triggers: string[];
  prewarmedData: any;
  ttl: number;
  priority: number;
}

export interface UsageAnalytics {
  totalRequests: number;
  patternDistribution: Record<AIPatternType, number>;
  cacheHitRates: {
    iflow: number;
    tavily: number;
    overall: number;
  };
  costSavings: number;
  lastAnalyzed: number;
}
