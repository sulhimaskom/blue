/**
 * Individual Enterprise Theme API Route
 *
 * Handles CRUD operations for specific enterprise themes
 * Path: /api/enterprise/themes/[customerId]
 */

import { z } from "zod";
import { logger } from "@/lib/logger";
import { enterpriseThemeManager } from "@/lib/constants/enterprise-themes";
import { NotFoundError } from "@/lib/api-utils";
import { APIRouteHandler } from "@/lib/services/api-route-handler";

// Validation schemas
const UpdateThemeSchema = z.object({
  brandName: z.string().min(1).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  customCSS: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/enterprise/themes/[customerId] - Get specific theme
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false,
  handler: async ({ context, req }) => {
    const urlParts = req.url.split("/");
    const customerId = urlParts[urlParts.length - 1];

    const theme = enterpriseThemeManager.getTheme(customerId!);

    if (!theme) {
      throw new NotFoundError(`Theme not found for customer: ${customerId}`);
    }

    const isActive =
      enterpriseThemeManager.getActiveTheme()?.customerId === customerId;

    logger.info("Enterprise theme retrieved", {
      requestId: context.requestId,
      customerId,
      brandName: theme.brandName,
      isActive,
    });

    return {
      theme,
      isActive,
    };
  },
});

// PUT /api/enterprise/themes/[customerId] - Update theme
export const PUT = APIRouteHandler.createPUTHandler({
  schema: UpdateThemeSchema,
  requireAuth: false,
  handler: async ({ context, data, req }) => {
    const urlParts = req.url.split("/");
    const customerId = urlParts[urlParts.length - 1];

    const existingTheme = enterpriseThemeManager.getTheme(customerId!);

    if (!existingTheme) {
      throw new NotFoundError(`Theme not found for customer: ${customerId}`);
    }

    const updatedTheme = {
      ...existingTheme,
      ...data,
    };

    if (data?.brandName && data.brandName !== existingTheme.brandName) {
      const newCustomerId = data.brandName.toLowerCase().replace(/\s+/g, "-");
      (updatedTheme as any).customerId = newCustomerId;
    }

    enterpriseThemeManager.registerTheme(updatedTheme);

    logger.info("Enterprise theme updated", {
      requestId: context.requestId,
      customerId,
      newCustomerId: (updatedTheme as any).customerId,
      brandName: updatedTheme.brandName,
      updatedFields: Object.keys(data || {}),
    });

    return {
      theme: updatedTheme,
      message: "Theme updated successfully",
    };
  },
});

// DELETE /api/enterprise/themes/[customerId] - Delete theme
export const DELETE = APIRouteHandler.createPOSTHandler({
  requireAuth: false,
  handler: async ({ context, req }) => {
    const urlParts = req.url.split("/");
    const customerId = urlParts[urlParts.length - 1];

    const existingTheme = enterpriseThemeManager.getTheme(customerId!);

    if (!existingTheme) {
      throw new NotFoundError(`Theme not found for customer: ${customerId}`);
    }

    const isActive =
      enterpriseThemeManager.getActiveTheme()?.customerId === customerId;
    if (isActive) {
      enterpriseThemeManager.resetTheme();
    }

    logger.warn("Theme deletion requested", {
      requestId: context.requestId,
      customerId,
      brandName: existingTheme.brandName,
      wasActive: isActive,
    });

    return {
      message: "Theme deleted successfully",
      warning:
        "Theme deletion requires implementation in EnterpriseThemeManager",
    };
  },
});
