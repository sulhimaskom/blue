import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { logger } from "@/lib/logger";
import { enterpriseThemeService } from "@/lib/services/enterprise-theme-service";
import { ValidationError } from "@/lib/api-utils";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.themesGet()(identifier),
  handler: async ({ context, user }) => {
    if (!user?.isAdmin) {
      throw new ValidationError("Only administrators can access theme analytics");
    }

    const result = await enterpriseThemeService.getAllThemesAnalytics();

    logger.info("Enterprise themes analytics retrieved", {
      requestId: context.requestId,
      userId: user.id,
      totalThemes: result.data?.totalThemes,
    });

    return result.data || null;
  },
});
