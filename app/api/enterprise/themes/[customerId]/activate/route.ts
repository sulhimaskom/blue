/**
 * Enterprise Theme Activation API Route
 *
 * Handles theme activation and deactivation
 * Path: /api/enterprise/themes/[customerId]/activate
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { enterpriseThemeManager } from "@/lib/constants/enterprise-themes";
import { ValidationError, NotFoundError } from "@/lib/api-utils";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";

interface ActivateThemeInput {
  activate: boolean;
}

interface RouteParams {
  params: Promise<{
    customerId: string;
  }>;
}

const ActivateThemeSchema = z.object({
  activate: z.boolean(),
});

async function POST(req: NextRequest, { params }: RouteParams) {
  const { customerId } = await params;

  return APIRouteHandler.createPOSTHandler<ActivateThemeInput>({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    schema: ActivateThemeSchema,
    handler: async ({ context, data, user }) => {
      const activate = data?.activate ?? false;
      const theme = enterpriseThemeManager.getTheme(customerId);

      if (!theme) {
        throw new NotFoundError(`Theme not found for customer: ${customerId}`);
      }

      // Authorization check: only admins or theme owners can activate themes
      if (!user?.isAdmin && user?.customerId !== customerId) {
        throw new ValidationError("You don't have permission to activate this theme");
      }

      let success = false;
      let message = "";

      if (activate) {
        success = enterpriseThemeManager.setActiveTheme(customerId);
        message = success
          ? "Theme activated successfully"
          : "Failed to activate theme";

        if (success) {
          logger.security("Enterprise theme activated", {
            requestId: context.requestId,
            userId: user!.id,
            customerId,
            brandName: theme.brandName,
          });
        }
      } else {
        const activeTheme = enterpriseThemeManager.getActiveTheme();
        if (activeTheme?.customerId === customerId) {
          enterpriseThemeManager.resetTheme();
          success = true;
          message = "Theme deactivated successfully";

          logger.security("Enterprise theme deactivated", {
            requestId: context.requestId,
            userId: user!.id,
            customerId,
            brandName: theme.brandName,
          });
        } else {
          success = false;
          message = "Theme is not currently active";
        }
      }

      if (!success) {
        throw new ValidationError(message);
      }

      const currentActiveTheme = enterpriseThemeManager.getActiveTheme();

      return {
        message,
        theme,
        isActive: currentActiveTheme?.customerId === customerId,
        activeTheme: currentActiveTheme,
      };
    },
  })(req);
}

export { POST };
