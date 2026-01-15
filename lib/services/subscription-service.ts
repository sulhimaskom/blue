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

// =============================================================================
// SUBSCRIPTION SERVICE CLASS
// =============================================================================

export class SubscriptionService {
  private static instance: SubscriptionService;
  private cache = new Map<string, { data: any; timestamp: number }>();
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

      const tierInfos: SubscriptionTierInfo[] = plans.map((plan: any) => ({
        tier: plan.tier as SubscriptionTier,
        limits: {
          maxCredits: plan.maxCredits,
          monthlyCreditAllowance: plan.monthlyCreditAllowance,
          apiRateLimitMultiplier: plan.apiRateLimitMultiplier,
          maxProjects: plan.maxProjects,
          maxTeams: plan.maxTeams,
          maxWebhooks: plan.maxWebhooks,
          maxBlueprintVersions: (plan.features as any)?.maxBlueprintVersions || 10,
          maxDeploymentsPerDay: (plan.features as any)?.maxDeploymentsPerDay || 5,
        },
        features: {
          advancedAnalytics: (plan.features as any)?.advancedAnalytics || false,
          customDomains: (plan.features as any)?.customDomains || false,
          prioritySupport: (plan.features as any)?.prioritySupport || false,
          apiAccess: (plan.features as any)?.apiAccess || false,
          teamCollaboration: (plan.features as any)?.teamCollaboration || false,
          webhookHistory: (plan.features as any)?.webhookHistory || 7,
          blueprintVersioning: (plan.features as any)?.blueprintVersioning || false,
          advancedDeployments: (plan.features as any)?.advancedDeployments || false,
          customThemes: (plan.features as any)?.customThemes || false,
          exportFeatures: (plan.features as any)?.exportFeatures || false,
          priorityQueue: (plan.features as any)?.priorityQueue || false,
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

      const breakdown: Record<
        string,
        { count: number; credits: number; percentage: number }
      > = {
        blueprint_generation: { count: 0, credits: 0, percentage: 0 },
        deployment_production: { count: 0, credits: 0, percentage: 0 },
        deployment_staging: { count: 0, credits: 0, percentage: 0 },
        team_invitation: { count: 0, credits: 0, percentage: 0 },
        team_creation: { count: 0, credits: 0, percentage: 0 },
        team_project_addition: { count: 0, credits: 0, percentage: 0 },
        other: { count: 0, credits: 0, percentage: 0 },
      };

      let totalCredits = 0;

      for (const activity of activities) {
        const creditsDeducted = (activity.eventData as Record<string, unknown>)?.creditsDeducted as number || 0;

        if (creditsDeducted <= 0) continue;

        totalCredits += creditsDeducted;

        let category = "other";

        if (activity.eventType === "blueprint_created") {
          category = "blueprint_generation";
        } else if (activity.eventType === "deployment_created") {
          if ((activity.eventData as Record<string, unknown>)?.environment === "production") {
            category = "deployment_production";
          } else {
            category = "deployment_staging";
          }
        } else if (activity.eventType === "team_member_invited") {
          category = "team_invitation";
        } else if (activity.eventType === "team_created") {
          category = "team_creation";
        } else if (activity.eventType === "team_project_added") {
          category = "team_project_addition";
        }

        if (breakdown[category]) {
          breakdown[category].count += 1;
          breakdown[category].credits += creditsDeducted;
        } else {
          breakdown.other.count += 1;
          breakdown.other.credits += creditsDeducted;
        }
      }

      for (const category in breakdown) {
        breakdown[category].percentage = totalCredits > 0 ? (breakdown[category].credits / totalCredits) * 100 : 0;
      }

      const dailyUsage: Map<string, number> = new Map();

      for (const activity of activities) {
        const dateKey = activity.timestamp.toISOString().split("T")[0];
        const creditsDeducted = (activity.eventData as Record<string, unknown>)?.creditsDeducted as number || 0;

        if (creditsDeducted > 0) {
          dailyUsage.set(dateKey, (dailyUsage.get(dateKey) || 0) + creditsDeducted);
        }
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

      const blueprintUsage = breakdown.blueprint_generation.credits;
      const deploymentUsage = breakdown.deployment_production.credits + breakdown.deployment_staging.credits;
      const teamUsage = breakdown.team_invitation.credits + breakdown.team_creation.credits + breakdown.team_project_addition.credits;

      if (teamUsage > totalCredits * 0.3) {
        recommendations.push(
          "Team operations consume a large portion of your credits (30%+). Consider consolidating team projects.",
        );
      }

      if (deploymentUsage > totalCredits * 0.4) {
        recommendations.push(
          "Consider using staging environments more frequently to reduce production deployment costs.",
        );
      }

      if (totalCredits > 0 && blueprintUsage === 0) {
        recommendations.push(
          "You haven't used blueprint generation recently. Explore AI-powered features to accelerate development.",
        );
      }

      if (totalCredits > 100) {
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

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
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