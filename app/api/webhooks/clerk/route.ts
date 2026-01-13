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
      switch (event.type) {
        case "user.created":
          const { id: createdId, email_addresses: createdEmails } = event.data;
          const primaryEmail = createdEmails?.[0]?.email_address;

          if (!primaryEmail) {
            logger.error("No email found for user creation", {
              requestId: context.requestId,
              clerkId: createdId,
              eventType: "user.created",
            });
            throw new DatabaseError("No email provided");
          }

          await UserService.createWebhookUser({
            clerkId: createdId,
            email: primaryEmail,
            requestId: context.requestId,
          });
          break;

        case "user.deleted":
          const { id: deletedId } = event.data;
          await UserService.deleteWebhookUser(deletedId, context.requestId);
          break;

        case "user.updated":
          const { id: updatedId, email_addresses: updatedEmails } = event.data;
          const updatedEmail = updatedEmails?.[0]?.email_address;

          if (updatedEmail) {
            await UserService.updateWebhookUser({
              clerkId: updatedId,
              email: updatedEmail,
              requestId: context.requestId,
            });
          }
          break;
      }
    },
  });
}

// For webhook testing - handle OPTIONS requests
export async function OPTIONS() {
  return WebhookService.handleOptions();
}
