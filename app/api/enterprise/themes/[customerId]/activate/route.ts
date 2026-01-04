/**
 * Enterprise Theme Activation API Route
 *
 * Handles theme activation and deactivation
 * Path: /api/enterprise/themes/[customerId]/activate
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger, createRequestContext } from "@/lib/logger";
import { enterpriseThemeManager } from "@/lib/constants/enterprise-themes";
import { ValidationError, NotFoundError } from "@/lib/api-utils";

// Validation schema
const ActivateThemeSchema = z.object({
  activate: z.boolean(),
});

interface RouteParams {
  params: Promise<{
    customerId: string;
  }>;
}

// POST /api/enterprise/themes/[customerId]/activate - Activate/deactivate theme
export async function POST(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext();
  const { customerId } = await params;
  let activate: boolean = false;

  try {
    const body = await request.json();
    const validationResult = ActivateThemeSchema.safeParse(body);

    if (!validationResult.success) {
      throw new ValidationError(
        `Validation failed: ${validationResult.error.message}`,
      );
    }

    activate = validationResult.data.activate;
    const theme = enterpriseThemeManager.getTheme(customerId);

    if (!theme) {
      throw new NotFoundError(`Theme not found for customer: ${customerId}`);
    }

    let success = false;
    let message = "";

    if (activate) {
      // Activate the theme
      success = enterpriseThemeManager.setActiveTheme(customerId);
      message = success
        ? "Theme activated successfully"
        : "Failed to activate theme";

      if (success) {
        logger.info("Enterprise theme activated", {
          requestId: context.requestId,
          customerId,
          brandName: theme.brandName,
        });
      }
    } else {
      // Deactivate - check if this is the active theme
      const activeTheme = enterpriseThemeManager.getActiveTheme();
      if (activeTheme?.customerId === customerId) {
        enterpriseThemeManager.resetTheme();
        success = true;
        message = "Theme deactivated successfully";

        logger.info("Enterprise theme deactivated", {
          requestId: context.requestId,
          customerId,
          brandName: theme.brandName,
        });
      } else {
        success = false;
        message = "Theme is not currently active";
      }
    }

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 400 },
      );
    }

    // Get current active theme for response
    const currentActiveTheme = enterpriseThemeManager.getActiveTheme();

    return NextResponse.json({
      success: true,
      data: {
        message,
        theme,
        isActive: currentActiveTheme?.customerId === customerId,
        activeTheme: currentActiveTheme,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn("Theme activation failed - not found", {
        requestId: context.requestId,
        customerId,
        activate: activate,
      });

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 },
      );
    }

    if (error instanceof ValidationError) {
      logger.warn("Theme activation validation failed", {
        requestId: context.requestId,
        customerId,
        error: error.message,
      });

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    logger.error("Failed to activate enterprise theme", {
      requestId: context.requestId,
      customerId,
      activate: activate,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process theme activation",
      },
      { status: 500 },
    );
  }
}
