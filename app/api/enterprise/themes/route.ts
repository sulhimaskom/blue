/**
 * Enterprise Theme Management API Route
 *
 * Provides REST endpoints for enterprise theme management
 * Supports CRUD operations for white-label customization
 *
 * Endpoints:
 * - GET /api/enterprise/themes - List all themes
 * - POST /api/enterprise/themes - Create new theme
 */

import { z } from "zod";
import { logger } from "@/lib/logger";
import { enterpriseThemeManager } from "@/lib/constants/enterprise-themes";
import { ValidationError } from "@/lib/api-utils";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";

// Validation schemas
const CreateThemeSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required"),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required"),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required"),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  customCSS: z.record(z.string()).optional(),
});

// GET /api/enterprise/themes - List all enterprise themes
export const GET = APIRouteHandler.createCachedGETHandler(
  {
    requireAuth: false,
    rateLimiter: (identifier: string) => RateLimiters.themesGet()(identifier),
    handler: async ({ context }) => {
      const themes = enterpriseThemeManager.getAllThemes();
      const activeTheme = enterpriseThemeManager.getActiveTheme();

      logger.info("Enterprise themes listed", {
        requestId: context.requestId,
        themeCount: themes.length,
        hasActiveTheme: !!activeTheme,
      });

      return {
        themes,
        activeTheme,
        total: themes.length,
      };
    },
  },
  {
    ttl: 1800,
    tags: ["enterprise-themes"],
    varyBy: [],
  },
);

// POST /api/enterprise/themes - Create new enterprise theme
export const POST = APIRouteHandler.createPOSTHandler({
  schema: CreateThemeSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.themesPost()(identifier),
  handler: async ({ context, data, user }) => {
    const themeData = data!;
    const customerId = themeData.brandName.toLowerCase().replace(/\s+/g, "-");

    // Authorization check: only admins can create themes
    if (!user?.isAdmin) {
      throw new ValidationError("Only administrators can create enterprise themes");
    }

    const existingTheme = enterpriseThemeManager.getTheme(customerId);
    if (existingTheme) {
      throw new ValidationError(
        `Theme for customer '${customerId}' already exists`,
      );
    }

    const newTheme = {
      customerId,
      ...themeData!,
      isActive: false,
    };

    enterpriseThemeManager.registerTheme(newTheme);

    logger.security("Enterprise theme created", {
      requestId: context.requestId,
      userId: user!.id,
      customerId,
      brandName: themeData.brandName,
      hasLogo: !!themeData.logoUrl,
    });

    return {
      theme: newTheme,
      message: "Enterprise theme created successfully",
    };
  },
});
