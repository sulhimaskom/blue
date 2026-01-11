/**
 * Type definitions for usage analytics services
 */

export interface UsageDataPoint {
  id: string;
  userId: string;
  teamId?: string;
  timestamp: Date;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  credits?: number;
}

export interface UsageSummary {
  totalUsage: number;
  totalCreditsUsed: number;
  periodStart: Date;
  periodEnd: Date;
  breakdown: {
    byAction: Record<string, number>;
    byResource: Record<string, number>;
    byDay: Record<string, number>;
  };
}

export interface CreditsReportData {
  userId: string;
  teamId?: string;
  credits: number;
  timestamp: Date;
  description: string;
  category: 'earned' | 'spent' | 'bonus';
}

export interface UsageAnalyticsOptions {
  period: {
    start: Date;
    end: Date;
  };
  groupBy?: 'day' | 'week' | 'month' | 'action' | 'resource';
  includeMetadata?: boolean;
  teamId?: string;
}

export interface UsageAnalyticsResult {
  summary: UsageSummary;
  data: UsageDataPoint[];
  insights: {
    peakUsageDay?: string;
    mostUsedAction?: string;
    mostConsumedResource?: string;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  };
}