import { NextRequest } from "next/server";
import { formatErrorResponse, DatabaseError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { UserService } from "@/lib/services/user-service";
import {
  ClerkWebhookEvent,
  type WebhookContext,
} from "@/lib/types/webhook-events";

export async function POST(req: NextRequest) {
  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.webhook()(identifier);

  if (!rateLimitCheck.allowed) {
    return formatErrorResponse(
      new Error("Rate limit exceeded. Try again in 60 seconds."),
    );
  }

  return WebhookService.processWebhookWithReliability(req, {
    serviceName: "Clerk",
    verifySignature: SecurityService.verifyClerkWebhook,
    useQueue: true, // Enable reliable queue-based processing
    processEvent: async (event: ClerkWebhookEvent, context: WebhookContext) => {
      // Handle user creation
      if (event.type === "user.created") {
        const { id, email_addresses } = event.data;
        const primaryEmail = email_addresses?.[0]?.email_address;

        if (!primaryEmail) {
          logger.error("No email found for user creation", {
            requestId: context.requestId,
            clerkId: id,
            eventType: "user.created",
          });
          throw new DatabaseError("No email provided");
        }

        await UserService.createWebhookUser({
          clerkId: id,
          email: primaryEmail,
          requestId: context.requestId,
        });
      }

      // Handle user deletion
      else if (event.type === "user.deleted") {
        const { id } = event.data;

        await UserService.deleteWebhookUser(id, context.requestId);
      }

      // Handle user email update
      else if (event.type === "user.updated") {
        const { id, email_addresses } = event.data;
        const primaryEmail = email_addresses?.[0]?.email_address;

        if (primaryEmail) {
          await UserService.updateWebhookUser({
            clerkId: id,
            email: primaryEmail,
            requestId: context.requestId,
          });
        }
      }
    },
  });
}

// For webhook testing - handle OPTIONS requests
export async function OPTIONS() {
  return WebhookService.handleOptions();
}
