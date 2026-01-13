/**
 * Subscription Service - Tier Management and Feature Gating
 *
 * Comprehensive service for managing subscription tiers, feature access control,
 * and usage limits. This service enforces business logic for monetization
 * and ensures fair resource allocation across different subscription tiers.
 */

import { ServiceResult } from "./service-types";
import { ServiceError } from "./service-error-handler";
import { logger as Logger } from "@/lib/logger";
import {
  users,
  subscriptionPlans,
  subscriptionUsage,
  type SubscriptionUsage,
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
   * Track resource usage for the current period
   */
  async trackUsage(
    userId: number,
    usageType: "credits" | "projects" | "teams" | "webhooks" | "api_requests",
    amount: number = 1,
  ): Promise<ServiceResult<void>> {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

      await db()
        .update(subscriptionUsage)
        .set({
          [usageType === "credits" ? "creditsUsed" :
           usageType === "projects" ? "projectsCreated" :
           usageType === "teams" ? "teamsCreated" :
           usageType === "webhooks" ? "webhooksCreated" :
           "apiRequests"]: sql`${usageType === "api_requests" ? "api_requests" : usageType} + ${amount}`,
          updatedAt: new Date(),
        })
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