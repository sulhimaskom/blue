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

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger, createRequestContext } from "@/lib/logger";
import { enterpriseThemeManager } from "@/lib/constants/enterprise-themes";
import { ValidationError } from "@/lib/api-utils";

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
  isActive: z.boolean().default(false),
});

// GET /api/enterprise/themes - List all enterprise themes
export async function GET() {
  const context = createRequestContext();

  try {
    const themes = enterpriseThemeManager.getAllThemes();
    const activeTheme = enterpriseThemeManager.getActiveTheme();

    logger.info("Enterprise themes listed", {
      requestId: context.requestId,
      themeCount: themes.length,
      hasActiveTheme: !!activeTheme,
    });

    return NextResponse.json({
      success: true,
      data: {
        themes,
        activeTheme,
        total: themes.length,
      },
    });
  } catch (error) {
    logger.error("Failed to list enterprise themes", {
      requestId: context.requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve themes",
      },
      { status: 500 },
    );
  }
}

// POST /api/enterprise/themes - Create new enterprise theme
export async function POST(request: NextRequest) {
  const context = createRequestContext();

  try {
    const body = await request.json();
    const validationResult = CreateThemeSchema.safeParse(body);

    if (!validationResult.success) {
      throw new ValidationError(
        `Validation failed: ${validationResult.error.message}`,
      );
    }

    const themeData = validationResult.data;
    const customerId = themeData.brandName.toLowerCase().replace(/\s+/g, "-");

    // Check if theme already exists
    const existingTheme = enterpriseThemeManager.getTheme(customerId);
    if (existingTheme) {
      throw new ValidationError(
        `Theme for customer '${customerId}' already exists`,
      );
    }

    const newTheme = {
      customerId,
      ...themeData,
    };

    enterpriseThemeManager.registerTheme(newTheme);

    logger.info("Enterprise theme created", {
      requestId: context.requestId,
      customerId,
      brandName: themeData.brandName,
      hasLogo: !!themeData.logoUrl,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          theme: newTheme,
          message: "Enterprise theme created successfully",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn("Theme creation validation failed", {
        requestId: context.requestId,
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

    logger.error("Failed to create enterprise theme", {
      requestId: context.requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create theme",
      },
      { status: 500 },
    );
  }
}
