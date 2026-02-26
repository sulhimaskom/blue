/**
 * Shared types for AI pattern detection services
 */

export type AIPatternType =
  | 'marketplace'
  | 'ecommerce'
  | 'social'
  | 'dashboard'
  | 'api-service'
  | 'mobile-app'
  | 'fintech'
  | 'healthcare'
  | 'edtech'
  | 'realestate'
  | 'logistics'
  | 'saas';

export interface AIPattern {
  type: AIPatternType;
  keywords: string[];
  frequency: number;
  lastSeen: number;
  confidence: number;
  cacheKeys: string[];
}

/**
 * Tech stack configuration for prewarmed blueprint data
 */
export interface TechStackConfig {
  frontend: string[];
  backend: string[];
  database: string;
  auth: string;
  payments?: string | string[];
  deployment: string;
  realTime?: string | string[];
  blockchain?: string[];
  video?: string[];
  content?: string[];
  maps?: string[];
  analytics?: string[];
}

/**
 * Architecture configuration for prewarmed blueprint data
 */
export interface ArchitectureConfig {
  type: string;
  scaling: string;
  database: string;
  cdn?: string;
  compliance?: string[];
  monitoring?: string[];
  security?: string[];
}

/**
 * Monetization option for prewarmed blueprint data
 */
export interface MonetizationOption {
  type: string;
  rate?: string;
  price?: string;
  margin?: string;
  model?: string;
  fee?: string;
  custom?: boolean;
  tier?: string;
}

/**
 * Prewarmed blueprint data structure
 */
export interface PrewarmedData {
  techStack: TechStackConfig;
  features: string[];
  architecture: ArchitectureConfig;
  monetization: MonetizationOption[];
  estimatedLines: number;
  complexity: string;
}

/**
 * Cache warming rule configuration
 */
export interface CacheWarmingRule {
  pattern: AIPatternType;
  triggers: string[];
  prewarmedData: PrewarmedData;
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
