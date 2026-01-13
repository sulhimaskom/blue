/**
 * Subscription Middleware for API Routes
 * 
 * Middleware functions to enforce subscription limits and feature gating
 * on API endpoints. This provides centralized access control based on
 * user subscription tiers.
 */

import { NextRequest } from "next/server";
import { subscriptionService } from "@/lib/services/subscription-service";
import { ServiceError } from "@/lib/services/service-error-handler";
import { logger as Logger } from "@/lib/logger";

// =============================================================================
// MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Check if user has sufficient credits for an operation
 */
export async function requireCredits(
  request: NextRequest,
  { requiredCredits = 1 }: { requiredCredits?: number } = {},
): Promise<{ success: boolean; userId?: number; error?: any }> {
  try {
    // Get user from request (this would need to be implemented based on your auth)
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return {
        success: false,
        error: new ServiceError("Authentication required", "SubscriptionMiddleware", "requireCredits"),
      };
    }

    const creditsResult = await subscriptionService.hasSufficientCredits(userId, requiredCredits);
    if (!creditsResult.success) {
      return creditsResult;
    }

    if (!creditsResult.data) {
      Logger.security(`Credits result not found`, { userId });
      return {
        success: false,
        error: new ServiceError("Credits result not found", "SubscriptionMiddleware", "requireCredits"),
      };
    }

    if (!creditsResult.data.hasCredits) {
      Logger.security(`Insufficient credits for operation`, {
        userId,
        requiredCredits,
        currentCredits: creditsResult.data.currentCredits,
      });

      return {
        success: false,
        error: new ServiceError(
          `Insufficient credits. Required: ${requiredCredits}, Available: ${creditsResult.data.currentCredits}`,
          "SubscriptionMiddleware",
          "requireCredits",
        ),
      };
    }

    // Track credit usage
    await subscriptionService.trackUsage(userId, "credits", requiredCredits);

    return { success: true, userId };
  } catch (error) {
    Logger.error("Credit check middleware failed", { error });
    return {
      success: false,
      error: new ServiceError("Credit check failed", "SubscriptionMiddleware", "requireCredits", error as Error),
    };
  }
}

/**
 * Check if user can create projects
 */
export async function requireProjectCreationAccess(
  request: NextRequest,
): Promise<{ success: boolean; userId?: number; error?: any }> {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return {
        success: false,
        error: new ServiceError("Authentication required", "SubscriptionMiddleware", "requireProjectCreationAccess"),
      };
    }

    const canCreateResult = await subscriptionService.canCreateProject(userId);
    if (!canCreateResult.success) {
      return canCreateResult;
    }

    if (!canCreateResult.data) {
      Logger.security(`Project creation result data not found`, { userId });
      return {
        success: false,
        error: new ServiceError("Project creation result not found", "SubscriptionMiddleware", "requireProjectCreationAccess"),
      };
    }

    if (!canCreateResult.data.canCreate) {
      Logger.security(`Project creation limit exceeded`, {
        userId,
        reason: canCreateResult.data.reason,
      });

      return {
        success: false,
        error: new ServiceError(
          canCreateResult.data.reason || "Project creation limit exceeded",
          "SubscriptionMiddleware",
          "requireProjectCreationAccess",
        ),
      };
    }

    // Track project creation
    await subscriptionService.trackUsage(userId, "projects");

    return { success: true, userId };
  } catch (error) {
    Logger.error("Project creation check middleware failed", { error });
    return {
      success: false,
      error: new ServiceError("Project creation check failed", "SubscriptionMiddleware", "requireProjectCreationAccess", error as Error),
    };
  }
}

/**
 * Check if user can create teams
 */
export async function requireTeamCreationAccess(
  request: NextRequest,
): Promise<{ success: boolean; userId?: number; error?: any }> {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return {
        success: false,
        error: new ServiceError("Authentication required", "SubscriptionMiddleware", "requireTeamCreationAccess"),
      };
    }

    const canCreateResult = await subscriptionService.canCreateTeam(userId);
    if (!canCreateResult.success) {
      return canCreateResult;
    }

    if (!canCreateResult.data) {
      Logger.security(`Team creation result data not found`, { userId });
      return {
        success: false,
        error: new ServiceError("Team creation result not found", "SubscriptionMiddleware", "requireTeamCreationAccess"),
      };
    }

    if (!canCreateResult.data.canCreate) {
      Logger.security(`Team creation limit exceeded`, {
        userId,
        reason: canCreateResult.data.reason,
      });

      return {
        success: false,
        error: new ServiceError(
          canCreateResult.data.reason || "Team creation limit exceeded",
          "SubscriptionMiddleware",
          "requireTeamCreationAccess",
        ),
      };
    }

    // Track team creation
    await subscriptionService.trackUsage(userId, "teams");

    return { success: true, userId };
  } catch (error) {
    Logger.error("Team creation check middleware failed", { error });
    return {
      success: false,
      error: new ServiceError("Team creation check failed", "SubscriptionMiddleware", "requireTeamCreationAccess", error as Error),
    };
  }
}

/**
 * Check if user has access to a specific feature
 */
export async function requireFeatureAccess(
  request: NextRequest,
  feature: string,
): Promise<{ success: boolean; userId?: number; tier?: any; error?: any }> {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return {
        success: false,
        error: new ServiceError("Authentication required", "SubscriptionMiddleware", "requireFeatureAccess"),
      };
    }

    const featureResult = await subscriptionService.checkFeatureAccess(
      userId,
      feature as any,
    );
    if (!featureResult.success) {
      return featureResult;
    }

    if (!featureResult.data) {
      Logger.security(`Feature access result data not found`, { userId, feature });
      return {
        success: false,
        error: new ServiceError("Feature access result not found", "SubscriptionMiddleware", "requireFeatureAccess"),
      };
    }

    if (!featureResult.data.hasAccess) {
      Logger.security(`Feature access denied`, {
        userId,
        feature,
        tier: (featureResult.data.tier as any)?.subscriptionTier,
      });

      return {
        success: false,
        error: new ServiceError(
          `Feature "${feature}" requires a higher subscription tier`,
          "SubscriptionMiddleware",
          "requireFeatureAccess",
        ),
      };
    }

    return { 
      success: true, 
      userId, 
      tier: featureResult.data.tier 
    };
  } catch (error) {
    Logger.error("Feature access check middleware failed", { feature, error });
    return {
      success: false,
      error: new ServiceError("Feature access check failed", "SubscriptionMiddleware", "requireFeatureAccess", error as Error),
    };
  }
}

/**
 * Get tier-aware rate limiter for the user
 */
export async function getTierAwareRateLimiter(
  request: NextRequest,
  category: string = "standard",
): Promise<{ limiter: any; userId?: number; error?: any }> {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      // Return default limiter for unauthenticated users
      const { RateLimiters } = await import("@/lib/rate-limit-config");
      return { limiter: RateLimiters.standard() };
    }

    const subscriptionResult = await subscriptionService.getCurrentUserSubscription(userId);
    if (!subscriptionResult.success) {
      // Return default limiter on error
      const { RateLimiters } = await import("@/lib/rate-limit-config");
      return { limiter: RateLimiters.standard() };
    }

    const tier = subscriptionResult.data?.tier;
    const { RateLimiters } = await import("@/lib/rate-limit-config");

    return {
      limiter: RateLimiters.forTier(tier, category as any),
      userId,
    };
  } catch (error) {
    Logger.error("Tier-aware rate limiter failed", { error });
    // Return default limiter on error
    const { RateLimiters } = await import("@/lib/rate-limit-config");
    return { limiter: RateLimiters.standard() };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract user ID from request
 * This needs to be implemented based on your authentication strategy
 */
function getUserIdFromRequest(request: NextRequest): number | null {
  // This is a placeholder - implement based on your auth system
  // For example, extract from JWT token, session, Clerk auth, etc.
  
  // For Clerk authentication (if available):
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      // Parse JWT or session to get user ID
      // This would need to match your auth implementation
    }
  } catch (error) {
    // Auth parsing failed
  }

  return null; // Placeholder - implement actual auth extraction
}

/**
 * Error response helper for middleware
 */
export function createMiddlewareError(error: ServiceError) {
  return Response.json(
    {
      success: false,
      error: error.message,
      details: error.operation,
    },
    {
      status: error.operation === "requireCredits" && error.message.includes("Insufficient") ? 402 :
             error.operation === "requireCredits" ? 401 :
             error.operation === "requireProjectCreationAccess" ? 403 :
             error.operation === "requireTeamCreationAccess" ? 403 :
             error.operation === "requireFeatureAccess" ? 403 : 500
    }
  );
}