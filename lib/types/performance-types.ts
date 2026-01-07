/**
 * Centralized TypeScript interfaces for performance monitoring
 *
 * Eliminates `any` type violations in performance components
 * Follows blueprint.md principle 8.3 ("no-explicit-any is strictly enforced")
 */

// ========================================
// Performance Alert Types
// ========================================

export interface PerformanceAlert {
  type: "critical" | "warning" | "info";
  metric: string;
  value: number;
  threshold: number;
  recommendation: string;
  severity: "high" | "medium" | "low";
  timestamp: number;
}

// ========================================
// Performance Metrics Types
// ========================================

export interface PerformanceMetrics {
  score: number;
  loadTime: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  alertCount: number;
  alerts: PerformanceAlert[];
  [key: string]: unknown;
}

// ========================================
// Bundle Analysis Types
// ========================================

export interface BundleMetrics {
  totalSize: number;
  gzippedSize: number;
  jsSize: number;
  cssSize: number;
  assetCount: number;
  chunkCount: number;
  largestChunk: number;
}

// ========================================
// Compression Metrics Types
// ========================================

export interface CompressionMetrics {
  originalSize: number;
  compressedSize: number;
  compressionRatePercent: number;
  bandwidthSavedKB: number;
  compressionMethod: "gzip" | "brotli" | "none";
  [key: string]: unknown;
}

// ========================================
// Optimization Types
// ========================================

export interface OptimizationSuggestion {
  category: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  priority: number;
}

export interface OptimizationResults {
  quickWins: string[];
  suggestions: OptimizationSuggestion[];
  autoOptimizations: string[];
  optimizedComponents: string[];
  codeSplitting: boolean;
  lazyLoading: boolean;
  treeShaking: boolean;
  [key: string]: unknown;
}

// ========================================
// Performance Data Types
// ========================================

export interface PerformanceData {
  performance: PerformanceMetrics;
  bundle: BundleMetrics;
  compression: CompressionMetrics;
  optimization?: OptimizationResults;
  timestamp: number;
  version: string;
  [key: string]: unknown;
}

export type PerformanceStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown";

// ========================================
// Performance Dashboard Response Types
// ========================================

export interface PerformanceDashboardResponse {
  performance: PerformanceMetrics;
  bundle: BundleMetrics;
  compression: CompressionMetrics;
  optimization: OptimizationResults;
  timestamp: number;
  version: string;
  success: boolean;
  message?: string;
}

// ========================================
// Computed Metrics Types (for Dashboard)
// ========================================

export interface ComputedPerformanceMetrics {
  performanceScore: number;
  bundleSizeKB: number;
  bundleSizeGzippedKB: number;
  compressionRate: number;
  bandwidthSavedKB: number;
  alertCount: number;
  timestamp: number;
  alerts?: PerformanceAlert[];
  quickWins?: string[];
}

// ========================================
// Type Guards and Utilities
// ========================================

export function isPerformanceData(data: unknown): data is PerformanceData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const perfData = data as PerformanceData;
  return (
    typeof perfData.timestamp === "number" &&
    typeof perfData.version === "string" &&
    typeof perfData.performance === "object" &&
    typeof perfData.bundle === "object"
  );
}

export function isPerformanceAlert(alert: unknown): alert is PerformanceAlert {
  if (!alert || typeof alert !== "object") {
    return false;
  }

  const perfAlert = alert as PerformanceAlert;
  return (
    typeof perfAlert.type === "string" &&
    typeof perfAlert.metric === "string" &&
    typeof perfAlert.value === "number" &&
    typeof perfAlert.threshold === "number" &&
    typeof perfAlert.recommendation === "string"
  );
}

export function getPerformanceStatus(
  score: number | undefined | null,
): PerformanceStatus {
  if (score === undefined || score === null) {
    return "unknown";
  }

  if (score >= 90) {
    return "healthy";
  }

  if (score >= 70) {
    return "degraded";
  }

  return "unhealthy";
}
