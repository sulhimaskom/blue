import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { logger } from "@/lib/logger";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError, NotFoundError } from "@/lib/api-utils";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookConfigurations } from "@/lib/db/schema";

const createWebhookConfigSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  url: z.string().url("Invalid URL format"),
  events: z.array(z.string()).min(1, "At least one event is required"),
  description: z.string().optional(),
});

const updateWebhookConfigSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  url: z.string().url("Invalid URL format").optional(),
  events: z
    .array(z.string())
    .min(1, "At least one event is required")
    .optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

// GET /api/webhooks/configure - List webhook configurations
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user }) => {
    if (!user) {
      throw new ValidationError("Authentication required");
    }

    const configs = await WebhookConfigurationService.getConfigurations(
      user.id,
    );

    logger.userAction("webhook_configurations_listed", user.id.toString(), {
      count: configs.length,
    });

    return { data: configs };
  },
});

// POST /api/webhooks/configure - Create webhook configuration
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  schema: createWebhookConfigSchema,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user, data }) => {
    if (!user) {
      throw new ValidationError("Authentication required");
    }

    if (!data) {
      throw new ValidationError("Request data is required");
    }

    const config = await WebhookConfigurationService.createConfiguration(
      user.id,
      data,
    );

    logger.userAction(
      "webhook_configuration_created_via_api",
      user.id.toString(),
      {
        configId: config.id,
        configName: config.name,
      },
    );

    return {
      data: config,
      message: "Webhook configuration created successfully",
    };
  },
});
