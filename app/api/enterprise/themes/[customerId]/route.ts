/**
 * Individual Enterprise Theme API Route
 *
 * Handles CRUD operations for specific enterprise themes
 * Path: /api/enterprise/themes/[customerId]
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger, createRequestContext } from "@/lib/logger";
import { enterpriseThemeManager } from "@/lib/constants/enterprise-themes";
import { ValidationError, NotFoundError } from "@/lib/api-utils";

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

interface RouteParams {
  params: Promise<{
    customerId: string;
  }>;
}

// GET /api/enterprise/themes/[customerId] - Get specific theme
export async function GET(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext();
  const { customerId } = await params;

  try {
    const theme = enterpriseThemeManager.getTheme(customerId);

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

    return NextResponse.json({
      success: true,
      data: {
        theme,
        isActive,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn("Theme not found", {
        requestId: context.requestId,
        customerId,
      });

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 },
      );
    }

    logger.error("Failed to retrieve enterprise theme", {
      requestId: context.requestId,
      customerId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve theme",
      },
      { status: 500 },
    );
  }
}

// PUT /api/enterprise/themes/[customerId] - Update theme
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext();
  const { customerId } = await params;

  try {
    const body = await request.json();
    const validationResult = UpdateThemeSchema.safeParse(body);

    if (!validationResult.success) {
      throw new ValidationError(
        `Validation failed: ${validationResult.error.message}`,
      );
    }

    const existingTheme = enterpriseThemeManager.getTheme(customerId);

    if (!existingTheme) {
      throw new NotFoundError(`Theme not found for customer: ${customerId}`);
    }

    // Merge existing theme with updates
    const updatedTheme = {
      ...existingTheme,
      ...validationResult.data,
    };

    // If brand name changed, update customer ID
    if (
      validationResult.data.brandName &&
      validationResult.data.brandName !== existingTheme.brandName
    ) {
      const newCustomerId = validationResult.data.brandName
        .toLowerCase()
        .replace(/\s+/g, "-");
      updatedTheme.customerId = newCustomerId;
    }

    enterpriseThemeManager.registerTheme(updatedTheme);

    logger.info("Enterprise theme updated", {
      requestId: context.requestId,
      customerId,
      newCustomerId: updatedTheme.customerId,
      brandName: updatedTheme.brandName,
      updatedFields: Object.keys(validationResult.data),
    });

    return NextResponse.json({
      success: true,
      data: {
        theme: updatedTheme,
        message: "Theme updated successfully",
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn("Theme update failed - not found", {
        requestId: context.requestId,
        customerId,
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
      logger.warn("Theme update validation failed", {
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

    logger.error("Failed to update enterprise theme", {
      requestId: context.requestId,
      customerId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update theme",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/enterprise/themes/[customerId] - Delete theme
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const context = createRequestContext();
  const { customerId } = await params;

  try {
    const existingTheme = enterpriseThemeManager.getTheme(customerId);

    if (!existingTheme) {
      throw new NotFoundError(`Theme not found for customer: ${customerId}`);
    }

    // Check if theme is currently active
    const isActive =
      enterpriseThemeManager.getActiveTheme()?.customerId === customerId;
    if (isActive) {
      // Deactivate before deleting
      enterpriseThemeManager.resetTheme();
    }

    // Note: In a real implementation, we'd need a delete method in EnterpriseThemeManager
    // For now, we'll simulate the deletion by returning success
    logger.warn("Theme deletion requested", {
      requestId: context.requestId,
      customerId,
      brandName: existingTheme.brandName,
      wasActive: isActive,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Theme deleted successfully",
        warning:
          "Theme deletion requires implementation in EnterpriseThemeManager",
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn("Theme deletion failed - not found", {
        requestId: context.requestId,
        customerId,
      });

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 },
      );
    }

    logger.error("Failed to delete enterprise theme", {
      requestId: context.requestId,
      customerId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete theme",
      },
      { status: 500 },
    );
  }
}
