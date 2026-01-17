/**
 * Subscription Service - Tier Management and Feature Gating
 *
 * Comprehensive service for managing subscription tiers, feature access control,
 * and usage limits. This service enforces business logic for monetization
 * and ensures fair resource allocation across different subscription tiers.
 */

import { ServiceResult } from "./service-types";
import { logger as Logger } from "@/lib/logger";
import {
  users,
  subscriptionPlans,
  subscriptionUsage,
  type SubscriptionUsage,
  activityLogs,
  teamMembers,
} from "@/lib/db/schema";
import { db, sql } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type SubscriptionTier = "free" | "pro" | "enterprise";

export interface SubscriptionPlanFeatures {
  maxBlueprintVersions?: number;
  maxDeploymentsPerDay?: number;
  advancedAnalytics?: boolean;
  customDomains?: boolean;
  prioritySupport?: boolean;
  apiAccess?: boolean;
  teamCollaboration?: boolean;
  webhookHistory?: number;
  blueprintVersioning?: boolean;
  advancedDeployments?: boolean;
  customThemes?: boolean;
  exportFeatures?: boolean;
  priorityQueue?: boolean;
}

export interface SubscriptionPlanRow {
  id: number;
  tier: string;
  maxCredits: number;
  monthlyCreditAllowance: number;
  apiRateLimitMultiplier: number;
  maxProjects: number;
  maxTeams: number;
  maxWebhooks: number;
  features: unknown;
  priceMonthly: number;
  priceYearly: number;
  stripePriceId: string | null;
  stripePriceIdYearly: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface TierFeatures {
  advancedAnalytics: boolean;
  customDomains: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  teamCollaboration: boolean;
  webhookHistory: number; // days
  blueprintVersioning: boolean;
  advancedDeployments: boolean;
  customThemes: boolean;
  exportFeatures: boolean;
  priorityQueue: boolean;
}

export interface TierLimits {
  maxCredits: number;
  monthlyCreditAllowance: number;
  apiRateLimitMultiplier: number;
  maxProjects: number;
  maxTeams: number;
  maxWebhooks: number;
  maxBlueprintVersions: number;
  maxDeploymentsPerDay: number;
}

export interface SubscriptionTierInfo {
  tier: SubscriptionTier;
  limits: TierLimits;
  features: TierFeatures;
  pricing: {
    monthly: number; // in cents
    yearly: number; // in cents
  };
  stripePriceIds: {
    monthly?: string;
    yearly?: string;
  };
}

export interface UsageMetrics {
  currentUsage: {
    credits: number;
    projects: number;
    teams: number;
    webhooks: number;
    apiRequests: number;
  };
  limits: TierLimits;
  remaining: {
    credits: number;
    projects: number;
    teams: number;
    webhooks: number;
  };
  percentageUsed: {
    credits: number;
    projects: number;
    teams: number;
    webhooks: number;
  };
}

export interface HistoricalUsageData {
  credits: Array<{ date: string; value: number }>;
  projects: Array<{ date: string; value: number }>;
  deployments: Array<{ date: string; value: number }>;
  apiRequests: Array<{ date: string; value: number }>;
}

export interface PredictionMetrics {
  credits: {
    dailyAverage: number;
    projectedExhaustionDate: string | null;
    tierRecommendation: {
      recommendedTier: SubscriptionTier | "current";
      reason: string;
      urgency: "immediate" | "upcoming" | "none";
    };
  };
  projects: {
    currentGrowthRate: number;
    projectedLimitHit: string | null;
  };
  deployments: {
    dailyAverage: number;
    monthlyProjection: number;
  };
  recommendations: Array<{
    type: "upgrade" | "optimization" | "info";
    title: string;
    description: string;
    action?: string;
  }>;
}

// =============================================================================
// SUBSCRIPTION SERVICE CLASS
// =============================================================================

export class SubscriptionService {
  private static instance: SubscriptionService;
  private cache = new Map<string, { data: SubscriptionTierInfo[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  // =============================================================================
  // TIER MANAGEMENT METHODS
  // =============================================================================

  /**
   * Get all available subscription tiers with their features and limits
   */
  async getSubscriptionTiers(): Promise<ServiceResult<SubscriptionTierInfo[]>> {
    try {
      const cacheKey = "subscription_tiers";
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const plans = await db()
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.sortOrder);

      const tierInfos: SubscriptionTierInfo[] = plans.map((plan: SubscriptionPlanRow) => ({
        tier: plan.tier as SubscriptionTier,
        limits: {
          maxCredits: plan.maxCredits,
          monthlyCreditAllowance: plan.monthlyCreditAllowance,
          apiRateLimitMultiplier: plan.apiRateLimitMultiplier,
          maxProjects: plan.maxProjects,
          maxTeams: plan.maxTeams,
          maxWebhooks: plan.maxWebhooks,
          maxBlueprintVersions: (plan.features as SubscriptionPlanFeatures)?.maxBlueprintVersions || 10,
          maxDeploymentsPerDay: (plan.features as SubscriptionPlanFeatures)?.maxDeploymentsPerDay || 5,
        },
        features: {
          advancedAnalytics: (plan.features as SubscriptionPlanFeatures)?.advancedAnalytics || false,
          customDomains: (plan.features as SubscriptionPlanFeatures)?.customDomains || false,
          prioritySupport: (plan.features as SubscriptionPlanFeatures)?.prioritySupport || false,
          apiAccess: (plan.features as SubscriptionPlanFeatures)?.apiAccess || false,
          teamCollaboration: (plan.features as SubscriptionPlanFeatures)?.teamCollaboration || false,
          webhookHistory: (plan.features as SubscriptionPlanFeatures)?.webhookHistory || 7,
          blueprintVersioning: (plan.features as SubscriptionPlanFeatures)?.blueprintVersioning || false,
          advancedDeployments: (plan.features as SubscriptionPlanFeatures)?.advancedDeployments || false,
          customThemes: (plan.features as SubscriptionPlanFeatures)?.customThemes || false,
          exportFeatures: (plan.features as SubscriptionPlanFeatures)?.exportFeatures || false,
          priorityQueue: (plan.features as SubscriptionPlanFeatures)?.priorityQueue || false,
        },
        pricing: {
          monthly: plan.priceMonthly,
          yearly: plan.priceYearly,
        },
        stripePriceIds: {
          monthly: plan.stripePriceId || undefined,
          yearly: plan.stripePriceIdYearly || undefined,
        },
      }));

      this.setCache(cacheKey, tierInfos);
      return { success: true, data: tierInfos };
    } catch (error) {
      Logger.error("Failed to get subscription tiers", { error });
      return {
        success: false,
        error: "Failed to get subscription tiers",
      };
    }
  }

  /**
   * Get subscription tier information for a specific tier
   */
  async getSubscriptionTier(tier: SubscriptionTier): Promise<ServiceResult<SubscriptionTierInfo | null>> {
    try {
      const tiersResult = await this.getSubscriptionTiers();
      if (!tiersResult.success || !tiersResult.data) {
        return {
          success: false,
          error: tiersResult.error || "Failed to get subscription tiers",
        };
      }

      const tierInfo = tiersResult.data?.find((t) => t.tier === tier) || null;
      return { success: true, data: tierInfo };
    } catch (error) {
      Logger.error("Failed to get subscription tier", { tier, error });
      return {
        success: false,
        error: "Failed to get subscription tier",
      };
    }
  }

  /**
   * Get current user's subscription tier and usage information
   */
  async getCurrentUserSubscription(userId: number): Promise<ServiceResult<SubscriptionTierInfo & { usage: UsageMetrics }>> {
    try {
      // Get user information
      const userResult = await db()
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const user = userResult[0];
      const userTier = user.subscriptionTier as SubscriptionTier;

      // Get tier configuration
      const tierResult = await this.getSubscriptionTier(userTier);
      if (!tierResult.success || !tierResult.data) {
        return {
          success: false,
          error: tierResult.error || "Invalid subscription tier",
        };
      }

      const tierInfo = tierResult.data;

      // Get current usage
      const usageResult = await this.getUserUsage(userId);
      if (!usageResult.success || !usageResult.data) {
        return {
          success: false,
          error: usageResult.error || "Failed to get user usage",
        };
      }

      return {
        success: true,
        data: {
          ...tierInfo,
          usage: usageResult.data,
        },
      };
    } catch (error) {
      Logger.error("Failed to get user subscription", { userId, error });
      return {
        success: false,
        error: "Failed to get user subscription",
      };
    }
  }

  // =============================================================================
  // FEATURE GATING METHODS
  // =============================================================================

  /**
   * Check if user has access to a specific feature
   */
  async checkFeatureAccess(
    userId: number,
    feature: keyof TierFeatures,
  ): Promise<ServiceResult<{ hasAccess: boolean; tier: SubscriptionTier }>> {
    try {
      const userResult = await db()
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const user = userResult[0];

      const tierResult = await this.getSubscriptionTier(user.subscriptionTier as SubscriptionTier);
      if (!tierResult.success || !tierResult.data) {
        return {
          success: false,
          error: "Invalid subscription tier",
        };
      }

      const hasAccess = Boolean(tierResult.data.features[feature]);

      Logger.userAction(`Feature access check`, userId.toString(), {
        feature,
        hasAccess,
        tier: user.subscriptionTier,
      });

      return {
        success: true,
        data: {
          hasAccess,
          tier: user.subscriptionTier as SubscriptionTier,
        },
      };
    } catch (error) {
      Logger.error("Failed to check feature access", { userId, feature, error });
      return {
        success: false,
        error: "Failed to check feature access",
      };
    }
  }

  /**
   * Validate if user can create a new project
   */
  async canCreateProject(userId: number): Promise<ServiceResult<{ canCreate: boolean; reason?: string }>> {
    try {
      const subscriptionResult = await this.getCurrentUserSubscription(userId);
      if (!subscriptionResult.success || !subscriptionResult.data) {
        return {
          success: false,
          error: subscriptionResult.error || "Failed to get subscription",
        };
      }

      const { usage, limits } = subscriptionResult.data;

      if (limits.maxProjects === -1) {
        return { success: true, data: { canCreate: true } };
      }

      if (usage.currentUsage.projects >= limits.maxProjects) {
        return {
          success: true,
          data: {
            canCreate: false,
            reason: `Project limit reached (${usage.currentUsage.projects}/${limits.maxProjects})`,
          },
        };
      }

      return { success: true, data: { canCreate: true } };
    } catch (error) {
      Logger.error("Failed to check project creation permission", { userId, error });
      return {
        success: false,
        error: "Failed to check project permission",
      };
    }
  }

  /**
   * Validate if user can create a new team
   */
  async canCreateTeam(userId: number): Promise<ServiceResult<{ canCreate: boolean; reason?: string }>> {
    try {
      const subscriptionResult = await this.getCurrentUserSubscription(userId);
      if (!subscriptionResult.success || !subscriptionResult.data) {
        return {
          success: false,
          error: subscriptionResult.error || "Failed to get subscription",
        };
      }

      const { usage, limits } = subscriptionResult.data;

      if (limits.maxTeams === -1) {
        return { success: true, data: { canCreate: true } };
      }

      if (usage.currentUsage.teams >= limits.maxTeams) {
        return {
          success: true,
          data: {
            canCreate: false,
            reason: `Team limit reached (${usage.currentUsage.teams}/${limits.maxTeams})`,
          },
        };
      }

      return { success: true, data: { canCreate: true } };
    } catch (error) {
      Logger.error("Failed to check team creation permission", { userId, error });
      return {
        success: false,
        error: "Failed to check team permission",
      };
    }
  }

  /**
   * Validate if user can invite a team member
   */
  async canInviteTeamMember(userId: number): Promise<ServiceResult<{ canInvite: boolean; reason?: string; currentCount?: number; limit?: number }>> {
    try {
      const subscriptionResult = await this.getCurrentUserSubscription(userId);
      if (!subscriptionResult.success || !subscriptionResult.data) {
        return {
          success: false,
          error: subscriptionResult.error || "Failed to get subscription",
        };
      }

      const { limits } = subscriptionResult.data;

      if (limits.maxTeams === -1) {
        return { success: true, data: { canInvite: true } };
      }

      const currentTeamMembers = await this.getTeamMemberCount(userId);

      if (currentTeamMembers >= limits.maxTeams) {
        return {
          success: true,
          data: {
            canInvite: false,
            reason: `Team member limit reached (${currentTeamMembers}/${limits.maxTeams})`,
            currentCount: currentTeamMembers,
            limit: limits.maxTeams,
          },
        };
      }

      return { success: true, data: { canInvite: true, currentCount: currentTeamMembers, limit: limits.maxTeams } };
    } catch (error) {
      Logger.error("Failed to check team member invitation permission", { userId, error });
      return {
        success: false,
        error: "Failed to check team member permission",
      };
    }
  }

  /**
   * Get current team member count for user across all teams
   */
  async getTeamMemberCount(userId: number): Promise<number> {
    try {
      const database = db();

      const result = await database
        .select({ count: sql<number>`count(*)` })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));

      return result[0]?.count || 0;
    } catch (error) {
      Logger.error("Failed to get team member count", { userId, error });
      return 0;
    }
  }

  /**
   * Validate if user has sufficient credits for an operation
   */
  async hasSufficientCredits(
    userId: number,
    requiredCredits: number,
  ): Promise<ServiceResult<{ hasCredits: boolean; currentCredits: number }>> {
    try {
      const userResult = await db()
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const user = userResult[0];
      const hasCredits = user.credits >= requiredCredits;

      return {
        success: true,
        data: {
          hasCredits,
          currentCredits: user.credits,
        },
      };
    } catch (error) {
      Logger.error("Failed to check credits", { userId, requiredCredits, error });
      return {
        success: false,
        error: "Failed to check credits",
      };
    }
  }

  // =============================================================================
  // USAGE TRACKING METHODS
  // =============================================================================

  /**
   * Get user's current usage metrics
   */
  async getUserUsage(userId: number): Promise<ServiceResult<UsageMetrics>> {
    try {
      const subscriptionResult = await this.getCurrentUserSubscription(userId);
      if (!subscriptionResult.success || !subscriptionResult.data) {
        return {
          success: false,
          error: subscriptionResult.error || "Failed to get subscription",
        };
      }

      const { limits } = subscriptionResult.data;

      // Get current period usage
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

      const usageResult = await db()
        .select()
        .from(subscriptionUsage)
        .where(
          and(
            eq(subscriptionUsage.userId, userId),
            eq(subscriptionUsage.period, currentPeriod),
          ),
        )
        .limit(1);

      let usage: SubscriptionUsage;
      if (usageResult.length === 0) {
        // Create usage record for current period
        const newUsage = await db()
          .insert(subscriptionUsage)
          .values({
            userId,
            period: currentPeriod,
            creditsGranted: limits.monthlyCreditAllowance,
          })
          .returning();
        usage = newUsage[0];
      } else {
        usage = usageResult[0];
      }

      // Get actual counts from database
      const { projects, teams, webhookConfigurations } = require("@/lib/db/schema");
      const [projectCount, teamCount, webhookCount] = await Promise.all([
        db().select().from(projects).where(eq(projects.ownerId, userId)),
        db().select().from(teams).where(eq(teams.ownerId, userId)),
        db().select().from(webhookConfigurations).where(eq(webhookConfigurations.userId, userId)),
      ]);

      const currentUsage = {
        credits: usage.creditsUsed,
        projects: projectCount.length,
        teams: teamCount.length,
        webhooks: webhookCount.length,
        apiRequests: usage.apiRequests,
      };

      const remaining = {
        credits: Math.max(0, limits.maxCredits - currentUsage.credits),
        projects: limits.maxProjects === -1 ? -1 : Math.max(0, limits.maxProjects - currentUsage.projects),
        teams: limits.maxTeams === -1 ? -1 : Math.max(0, limits.maxTeams - currentUsage.teams),
        webhooks: limits.maxWebhooks === -1 ? -1 : Math.max(0, limits.maxWebhooks - currentUsage.webhooks),
      };

      const percentageUsed = {
        credits: limits.maxCredits > 0 ? (currentUsage.credits / limits.maxCredits) * 100 : 0,
        projects: limits.maxProjects > 0 ? (currentUsage.projects / limits.maxProjects) * 100 : 0,
        teams: limits.maxTeams > 0 ? (currentUsage.teams / limits.maxTeams) * 100 : 0,
        webhooks: limits.maxWebhooks > 0 ? (currentUsage.webhooks / limits.maxWebhooks) * 100 : 0,
      };

      return {
        success: true,
        data: {
          currentUsage,
          limits,
          remaining,
          percentageUsed,
        },
      };
    } catch (error) {
      Logger.error("Failed to get user usage", { userId, error });
      return {
        success: false,
        error: "Failed to get user usage",
      };
    }
  }

  /**
   * Track resource usage for current period
   */
  async trackUsage(
    userId: number,
    usageType: "credits" | "projects" | "teams" | "webhooks" | "api_requests",
    amount: number = 1,
  ): Promise<ServiceResult<void>> {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

      const updates: Record<string, unknown> = { updatedAt: new Date() };

      switch (usageType) {
        case "credits":
          updates.creditsUsed = sql`creditsUsed + ${amount}`;
          break;
        case "projects":
          updates.projectsCreated = sql`projectsCreated + ${amount}`;
          break;
        case "teams":
          updates.teamsCreated = sql`teamsCreated + ${amount}`;
          break;
        case "webhooks":
          updates.webhooksCreated = sql`webhooksCreated + ${amount}`;
          break;
        case "api_requests":
          updates.apiRequests = sql`apiRequests + ${amount}`;
          break;
      }

      await db()
        .update(subscriptionUsage)
        .set(updates)
        .where(
          and(
            eq(subscriptionUsage.userId, userId),
            eq(subscriptionUsage.period, currentPeriod),
          ),
        );

      Logger.userAction(`Usage tracked`, userId.toString(), {
        usageType,
        amount,
        period: currentPeriod,
      });

      return { success: true, data: undefined };
    } catch (error) {
      Logger.error("Failed to track usage", { userId, usageType, amount, error });
      return {
        success: false,
        error: "Failed to track usage",
      };
    }
  }

  /**
   * Get detailed credit usage breakdown by operation type
   * Analyzes activity logs to categorize credit consumption
   */
  async getCreditUsageBreakdown(userId: number): Promise<
    ServiceResult<{
      breakdown: Record<
        string,
        { count: number; credits: number; percentage: number }
      >;
      chartData: Array<{ date: string; credits: number }>;
      recommendations: string[];
      topOperations: Array<{
        type: string;
        count: number;
        credits: number;
      }>;
      totalCredits: number;
    }>
  > {
    try {
      const database = db();

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const activities = await database
        .select({
          eventType: activityLogs.eventType,
          eventData: activityLogs.eventData,
          timestamp: activityLogs.timestamp,
        })
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.userId, userId),
            sql`${activityLogs.timestamp} >= ${ninetyDaysAgo}`,
          ),
        )
        .orderBy(activityLogs.timestamp);

      const CATEGORIES = {
        BLUEPRINT_GENERATION: "blueprint_generation",
        DEPLOYMENT_PRODUCTION: "deployment_production",
        DEPLOYMENT_STAGING: "deployment_staging",
        TEAM_INVITATION: "team_invitation",
        TEAM_CREATION: "team_creation",
        TEAM_PROJECT_ADDITION: "team_project_addition",
        OTHER: "other",
      } as const;

      const EVENT_TYPE_TO_CATEGORY: Record<string, string> = {
        blueprint_created: CATEGORIES.BLUEPRINT_GENERATION,
        team_member_invited: CATEGORIES.TEAM_INVITATION,
        team_created: CATEGORIES.TEAM_CREATION,
        team_project_added: CATEGORIES.TEAM_PROJECT_ADDITION,
      };

      const RECOMMENDATION_THRESHOLDS = {
        TEAM_USAGE: 0.3,
        DEPLOYMENT_USAGE: 0.4,
        HIGH_CREDIT_USAGE: 100,
        ANALYSIS_WINDOW_DAYS: 90,
      } as const;

      const breakdown: Record<
        string,
        { count: number; credits: number; percentage: number }
      > = {
        [CATEGORIES.BLUEPRINT_GENERATION]: { count: 0, credits: 0, percentage: 0 },
        [CATEGORIES.DEPLOYMENT_PRODUCTION]: { count: 0, credits: 0, percentage: 0 },
        [CATEGORIES.DEPLOYMENT_STAGING]: { count: 0, credits: 0, percentage: 0 },
        [CATEGORIES.TEAM_INVITATION]: { count: 0, credits: 0, percentage: 0 },
        [CATEGORIES.TEAM_CREATION]: { count: 0, credits: 0, percentage: 0 },
        [CATEGORIES.TEAM_PROJECT_ADDITION]: { count: 0, credits: 0, percentage: 0 },
        [CATEGORIES.OTHER]: { count: 0, credits: 0, percentage: 0 },
      };

      let totalCredits = 0;
      const dailyUsage: Map<string, number> = new Map();

      for (const activity of activities) {
        const creditsDeducted = (activity.eventData as Record<string, unknown>)?.creditsDeducted as number || 0;

        if (creditsDeducted <= 0) continue;

        totalCredits += creditsDeducted;

        let category: string = CATEGORIES.OTHER;

        if (activity.eventType === "deployment_created") {
          category = (activity.eventData as { environment?: string })?.environment === "production"
            ? CATEGORIES.DEPLOYMENT_PRODUCTION
            : CATEGORIES.DEPLOYMENT_STAGING;
        } else {
          category = EVENT_TYPE_TO_CATEGORY[activity.eventType] || CATEGORIES.OTHER;
        }

        const breakdownCategory = breakdown[category];
        if (breakdownCategory) {
          breakdownCategory.count += 1;
          breakdownCategory.credits += creditsDeducted;
        }

        const dateKey = activity.timestamp.toISOString().split("T")[0];
        dailyUsage.set(dateKey, (dailyUsage.get(dateKey) || 0) + creditsDeducted);
      }

      for (const category in breakdown) {
        breakdown[category].percentage = totalCredits > 0 ? (breakdown[category].credits / totalCredits) * 100 : 0;
      }

      const chartData: Array<{ date: string; credits: number }> = [];
      const sortedDates = Array.from(dailyUsage.keys()).sort();

      for (const date of sortedDates) {
        chartData.push({
          date,
          credits: dailyUsage.get(date) || 0,
        });
      }

      const recommendations: string[] = [];
      const topOperations = Object.entries(breakdown)
        .map(([type, data]) => ({ type, ...data }))
        .filter((op) => op.credits > 0)
        .sort((a, b) => b.credits - a.credits)
        .slice(0, 5);

      const blueprintUsage = breakdown[CATEGORIES.BLUEPRINT_GENERATION].credits;
      const deploymentUsage = breakdown[CATEGORIES.DEPLOYMENT_PRODUCTION].credits + breakdown[CATEGORIES.DEPLOYMENT_STAGING].credits;
      const teamUsage = breakdown[CATEGORIES.TEAM_INVITATION].credits + breakdown[CATEGORIES.TEAM_CREATION].credits + breakdown[CATEGORIES.TEAM_PROJECT_ADDITION].credits;

      if (teamUsage > totalCredits * RECOMMENDATION_THRESHOLDS.TEAM_USAGE) {
        recommendations.push(
          `Team operations consume a large portion of your credits (${(RECOMMENDATION_THRESHOLDS.TEAM_USAGE * 100).toFixed(0)}%+). Consider consolidating team projects.`,
        );
      }

      if (deploymentUsage > totalCredits * RECOMMENDATION_THRESHOLDS.DEPLOYMENT_USAGE) {
        recommendations.push(
          "Consider using staging environments more frequently to reduce production deployment costs.",
        );
      }

      if (totalCredits > 0 && blueprintUsage === 0) {
        recommendations.push(
          "You haven't used blueprint generation recently. Explore AI-powered features to accelerate development.",
        );
      }

      if (totalCredits > RECOMMENDATION_THRESHOLDS.HIGH_CREDIT_USAGE) {
        recommendations.push(
          "Your credit usage is high. Consider upgrading to Pro or Enterprise tier for better value.",
        );
      }

      return {
        success: true,
        data: {
          breakdown,
          chartData,
          recommendations,
          topOperations,
          totalCredits,
        },
      };
    } catch (error) {
      Logger.error("Failed to get credit usage breakdown", { userId, error });
      return {
        success: false,
        error: "Failed to get credit usage breakdown",
      };
    }
  }

  // =============================================================================
  // PREDICTIVE ANALYTICS METHODS
  // =============================================================================

  /**
   * Get historical usage data for the last 90 days
   */
  async getHistoricalUsage(userId: number, days: number = 90): Promise<ServiceResult<HistoricalUsageData>> {
    try {
      const database = db();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const historicalData: HistoricalUsageData = {
        credits: [],
        projects: [],
        deployments: [],
        apiRequests: [],
      };

      const usageRecords = await database
        .select()
        .from(subscriptionUsage)
        .where(
          and(
            eq(subscriptionUsage.userId, userId),
            sql`${subscriptionUsage.period} >= ${startDate.toISOString().slice(0, 7)}`
          )
        )
        .orderBy(subscriptionUsage.period);

      for (const record of usageRecords) {
        const monthStart = new Date(record.period + "-01");
        const monthEnd = new Date(record.period + "-01");
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);

        const daysInMonth = monthEnd.getDate();
        const dailyCredits = record.creditsUsed / daysInMonth;
        const dailyApiRequests = record.apiRequests / daysInMonth;
        const dailyProjects = record.projectsCreated / daysInMonth;

        let dayIndex = 0;
        for (let d = new Date(Math.max(monthStart.getTime(), startDate.getTime())); d <= monthEnd; d.setDate(d.getDate() + 1)) {
          if (dayIndex >= daysInMonth) break;
          const dateStr = d.toISOString().split("T")[0];
          historicalData.credits.push({ date: dateStr, value: dailyCredits });
          historicalData.apiRequests.push({ date: dateStr, value: dailyApiRequests });
          historicalData.projects.push({ date: dateStr, value: dailyProjects });
          dayIndex++;
        }
      }

      for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        if (!historicalData.credits.find((item) => item.date === dateStr)) {
          historicalData.credits.push({ date: dateStr, value: 0 });
          historicalData.apiRequests.push({ date: dateStr, value: 0 });
          historicalData.projects.push({ date: dateStr, value: 0 });
        }
      }

      const deploymentActivities = await database
        .select({ eventType: activityLogs.eventType, timestamp: activityLogs.timestamp })
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.userId, userId),
            eq(activityLogs.eventType, "deployment_created"),
            sql`${activityLogs.timestamp} >= ${startDate}`
          )
        )
        .orderBy(activityLogs.timestamp);

      const deploymentByDay = new Map<string, number>();
      for (const activity of deploymentActivities) {
        const dateStr = activity.timestamp.toISOString().split("T")[0];
        deploymentByDay.set(dateStr, (deploymentByDay.get(dateStr) || 0) + 1);
      }

      for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        historicalData.deployments.push({ date: dateStr, value: deploymentByDay.get(dateStr) || 0 });
      }

      historicalData.credits.sort((a, b) => a.date.localeCompare(b.date));
      historicalData.projects.sort((a, b) => a.date.localeCompare(b.date));
      historicalData.deployments.sort((a, b) => a.date.localeCompare(b.date));
      historicalData.apiRequests.sort((a, b) => a.date.localeCompare(b.date));

      return { success: true, data: historicalData };
    } catch (error) {
      Logger.error("Failed to get historical usage", { userId, days, error });
      return {
        success: false,
        error: "Failed to get historical usage",
      };
    }
  }

  /**
   * Calculate daily average from historical data
   */
  private calculateDailyAverage(data: Array<{ date: string; value: number }>): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + item.value, 0);
    return Math.round(sum / data.length * 100) / 100;
  }

  /**
   * Calculate growth rate using linear regression
   */
  private calculateGrowthRate(data: Array<{ date: string; value: number }>): number {
    if (data.length < 2) return 0;

    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = data[i].value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : Math.round(slope * 100) / 100;
  }

  /**
   * Predict when credits will be exhausted based on usage rate
   */
  private predictExhaustionDate(
    currentCredits: number,
    remainingCredits: number,
    dailyAverage: number,
  ): string | null {
    if (dailyAverage <= 0) return null;
    if (remainingCredits === -1) return null;

    const daysUntilExhaustion = Math.floor(remainingCredits / dailyAverage);
    if (daysUntilExhaustion < 0) return null;

    const exhaustionDate = new Date();
    exhaustionDate.setDate(exhaustionDate.getDate() + daysUntilExhaustion);

    return exhaustionDate.toISOString().split("T")[0];
  }

  /**
   * Predict when project limit will be hit based on growth rate
   */
  private predictLimitHit(
    currentProjects: number,
    maxProjects: number,
    historicalData: Array<{ date: string; value: number }>,
  ): string | null {
    if (maxProjects === -1) return null;
    if (currentProjects >= maxProjects) return new Date().toISOString().split("T")[0];

    const growthRate = this.calculateGrowthRate(historicalData);
    if (growthRate <= 0) return null;

    const remainingProjects = maxProjects - currentProjects;
    const daysUntilLimit = Math.ceil(remainingProjects / growthRate);

    if (daysUntilLimit <= 0 || daysUntilLimit > 365) return null;

    const limitHitDate = new Date();
    limitHitDate.setDate(limitHitDate.getDate() + daysUntilLimit);

    return limitHitDate.toISOString().split("T")[0];
  }

  /**
   * Recommend tier based on usage patterns and projections
   */
  private recommendTierForCredits(
    currentUsage: number,
    maxCredits: number,
    historicalData: Array<{ date: string; value: number }>,
    exhaustionDate: string | null,
  ): {
    recommendedTier: SubscriptionTier | "current";
    reason: string;
    urgency: "immediate" | "upcoming" | "none";
  } {
    const percentageUsed = maxCredits > 0 ? (currentUsage / maxCredits) * 100 : 0;

    if (exhaustionDate) {
      const today = new Date();
      const exhaustion = new Date(exhaustionDate);
      const daysUntilExhaustion = Math.ceil((exhaustion.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExhaustion <= 7) {
        return {
          recommendedTier: "pro",
          reason: `Credits will be exhausted in ${daysUntilExhaustion} day${daysUntilExhaustion !== 1 ? 's' : ''}`,
          urgency: "immediate",
        };
      }

      if (daysUntilExhaustion <= 30) {
        return {
          recommendedTier: "pro",
          reason: `${percentageUsed.toFixed(0)}% of credits used, exhaustion in ${daysUntilExhaustion} days`,
          urgency: "upcoming",
        };
      }
    }

    if (percentageUsed > 80) {
      return {
        recommendedTier: "pro",
        reason: `${percentageUsed.toFixed(0)}% of credits used, consider upgrading to avoid hitting limits`,
        urgency: "upcoming",
      };
    }

    return {
      recommendedTier: "current",
      reason: "Current tier meets your usage needs",
      urgency: "none",
    };
  }

  /**
   * Project monthly usage based on historical trends
   */
  private projectMonthlyUsage(
    historicalData: Array<{ date: string; value: number }>,
  ): number {
    if (historicalData.length === 0) return 0;

    const dailyAverage = this.calculateDailyAverage(historicalData);
    const growthRate = this.calculateGrowthRate(historicalData);
    const daysInMonth = 30;

    const projectedDailyUsage = Math.max(0, dailyAverage + growthRate * (daysInMonth / 2));
    const monthlyProjection = Math.round(projectedDailyUsage * daysInMonth);

    return monthlyProjection;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    predictions: Pick<PredictionMetrics, "credits" | "projects" | "deployments">,
    currentUsage: UsageMetrics,
  ): Array<{
    type: "upgrade" | "optimization" | "info";
    title: string;
    description: string;
    action?: string;
  }> {
    const recommendations: Array<{
      type: "upgrade" | "optimization" | "info";
      title: string;
      description: string;
      action?: string;
    }> = [];

    if (predictions.credits.tierRecommendation.urgency === "immediate") {
      recommendations.push({
        type: "upgrade",
        title: "Upgrade subscription urgently",
        description: predictions.credits.tierRecommendation.reason,
        action: "Upgrade to Pro tier",
      });
    }

    if (predictions.credits.tierRecommendation.urgency === "upcoming") {
      recommendations.push({
        type: "upgrade",
        title: "Consider subscription upgrade",
        description: predictions.credits.tierRecommendation.reason,
        action: "View tier options",
      });
    }

    if (predictions.projects.projectedLimitHit) {
      const daysUntilLimit = Math.ceil(
        (new Date(predictions.projects.projectedLimitHit).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysUntilLimit <= 30) {
        recommendations.push({
          type: "upgrade",
          title: "Project limit approaching",
          description: `Project limit will be hit in ${daysUntilLimit} days`,
          action: "Increase project limit",
        });
      }
    }

    if (currentUsage.percentageUsed.credits > 70) {
      recommendations.push({
        type: "optimization",
        title: "Optimize credit usage",
        description: "You're using 70%+ of your credits. Consider optimizing deployments",
        action: "View usage breakdown",
      });
    }

    if (predictions.deployments.dailyAverage > 5) {
      recommendations.push({
        type: "info",
        title: "High deployment activity",
        description: `Average ${predictions.deployments.dailyAverage.toFixed(1)} deployments per day detected`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: "info",
        title: "Usage is optimal",
        description: "Your current usage patterns are well within your tier limits",
      });
    }

    return recommendations;
  }

  /**
   * Get predictive analytics for user subscription usage
   */
  async getPredictiveAnalytics(userId: number): Promise<ServiceResult<PredictionMetrics>> {
    try {
      const usageResult = await this.getUserUsage(userId);
      if (!usageResult.success || !usageResult.data) {
        return {
          success: false,
          error: usageResult.error || "Failed to get usage data",
        };
      }

      const historicalResult = await this.getHistoricalUsage(userId, 90);
      if (!historicalResult.success || !historicalResult.data) {
        return {
          success: false,
          error: historicalResult.error || "Failed to get historical data",
        };
      }

      const { currentUsage, remaining, limits } = usageResult.data;
      const historicalData = historicalResult.data;

      const creditsDailyAverage = this.calculateDailyAverage(historicalData.credits);
      const projectedExhaustionDate = this.predictExhaustionDate(
        currentUsage.credits,
        remaining.credits,
        creditsDailyAverage,
      );

      const tierRecommendation = this.recommendTierForCredits(
        currentUsage.credits,
        limits.maxCredits,
        historicalData.credits,
        projectedExhaustionDate,
      );

      const projectsGrowthRate = this.calculateGrowthRate(historicalData.projects);
      const projectedLimitHit = this.predictLimitHit(
        currentUsage.projects,
        limits.maxProjects,
        historicalData.projects,
      );

      const deploymentsDailyAverage = this.calculateDailyAverage(historicalData.deployments);
      const deploymentsMonthlyProjection = this.projectMonthlyUsage(historicalData.deployments);

      const predictions: PredictionMetrics = {
        credits: {
          dailyAverage: creditsDailyAverage,
          projectedExhaustionDate,
          tierRecommendation,
        },
        projects: {
          currentGrowthRate: projectsGrowthRate,
          projectedLimitHit,
        },
        deployments: {
          dailyAverage: deploymentsDailyAverage,
          monthlyProjection: deploymentsMonthlyProjection,
        },
        recommendations: this.generateRecommendations(
          {
            credits: { dailyAverage: creditsDailyAverage, projectedExhaustionDate, tierRecommendation },
            projects: { currentGrowthRate: projectsGrowthRate, projectedLimitHit },
            deployments: { dailyAverage: deploymentsDailyAverage, monthlyProjection: deploymentsMonthlyProjection },
          },
          usageResult.data,
        ),
      };

      return { success: true, data: predictions };
    } catch (error) {
      Logger.error("Failed to get predictive analytics", { userId, error });
      return {
        success: false,
        error: "Failed to get predictive analytics",
      };
    }
  }

  // =============================================================================
  // SUBSCRIPTION UPGRADE METHODS
  // =============================================================================

  /**
   * Process subscription tier upgrade
   */
  async upgradeSubscription(
    userId: number,
    newTier: SubscriptionTier,
    stripeSubscriptionId?: string,
  ): Promise<ServiceResult<void>> {
    try {
      // Validate new tier
      const tierResult = await this.getSubscriptionTier(newTier);
      if (!tierResult.success || !tierResult.data) {
        return {
          success: false,
          error: "Invalid subscription tier",
        };
      }

      // Update user's subscription tier
      await db()
        .update(users)
        .set({
          subscriptionTier: newTier,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Add credits for upgrade (one-time grant)
      if (tierResult.data.limits.monthlyCreditAllowance > 0) {
        await db()
          .update(users)
          .set({
            credits: sql`credits + ${tierResult.data.limits.monthlyCreditAllowance}`,
          })
          .where(eq(users.id, userId));
      }

      Logger.userAction(`Subscription upgraded`, userId.toString(), {
        newTier,
        stripeSubscriptionId,
        creditsGranted: tierResult.data.limits.monthlyCreditAllowance,
      });

      return { success: true, data: undefined };
    } catch (error) {
      Logger.error("Failed to upgrade subscription", { userId, newTier, error });
      return {
        success: false,
        error: "Failed to upgrade subscription",
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private getFromCache(key: string): SubscriptionTierInfo[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: SubscriptionTierInfo[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const subscriptionService = SubscriptionService.getInstance();