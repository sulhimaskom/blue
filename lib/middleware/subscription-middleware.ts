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
        error: new ServiceError("Authentication required", "AUTHENTICATION_REQUIRED"),
      };
    }

    const creditsResult = await subscriptionService.hasSufficientCredits(userId, requiredCredits);
    if (!creditsResult.success) {
      return creditsResult;
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
          "INSUFFICIENT_CREDITS",
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
      error: new ServiceError("Credit check failed", "CREDIT_CHECK_ERROR"),
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
        error: new ServiceError("Authentication required", "AUTHENTICATION_REQUIRED"),
      };
    }

    const canCreateResult = await subscriptionService.canCreateProject(userId);
    if (!canCreateResult.success) {
      return canCreateResult;
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
          "PROJECT_LIMIT_EXCEEDED",
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
      error: new ServiceError("Project creation check failed", "PROJECT_CHECK_ERROR"),
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
        error: new ServiceError("Authentication required", "AUTHENTICATION_REQUIRED"),
      };
    }

    const canCreateResult = await subscriptionService.canCreateTeam(userId);
    if (!canCreateResult.success) {
      return canCreateResult;
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
          "TEAM_LIMIT_EXCEEDED",
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
      error: new ServiceError("Team creation check failed", "TEAM_CHECK_ERROR"),
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
        error: new ServiceError("Authentication required", "AUTHENTICATION_REQUIRED"),
      };
    }

    const featureResult = await subscriptionService.checkFeatureAccess(
      userId,
      feature as any,
    );
    if (!featureResult.success) {
      return featureResult;
    }

    if (!featureResult.data.hasAccess) {
      Logger.security(`Feature access denied`, {
        userId,
        feature,
        tier: featureResult.data.tier.subscriptionTier,
      });

      return {
        success: false,
        error: new ServiceError(
          `Feature "${feature}" requires a higher subscription tier`,
          "FEATURE_ACCESS_DENIED",
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
      error: new ServiceError("Feature access check failed", "FEATURE_CHECK_ERROR"),
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

    const tier = subscriptionResult.data.tier;
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
      details: error.code,
    },
    { 
      status: error.code === "AUTHENTICATION_REQUIRED" ? 401 :
             error.code === "INSUFFICIENT_CREDITS" ? 402 :
             error.code.includes("LIMIT_EXCEEDED") ? 403 :
             error.code === "FEATURE_ACCESS_DENIED" ? 403 : 500
    }
  );
}