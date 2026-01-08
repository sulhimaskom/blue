import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DatabaseError, formatErrorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { CREDIT_RULES } from "@/lib/constants";
import { RateLimiters } from "@/lib/rate-limit-config";
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
      const database = db();

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

        // Check if user already exists
        const [existingUser] = await database
          .select()
          .from(users)
          .where(eq(users.clerkId, id))
          .limit(1);

        if (!existingUser) {
          // Create new user with default credits
          const [newUser] = await database
            .insert(users)
            .values({
              clerkId: id,
              email: primaryEmail,
              credits: CREDIT_RULES.SIGNUP_BONUS, // Give free credits on signup
              subscriptionTier: "free",
            })
            .returning();

          logger.userAction("New user created via webhook", newUser.clerkId, {
            requestId: context.requestId,
            userId: newUser.id,
            email: primaryEmail,
            creditsGiven: 5,
            eventType: "user.created",
          });
        }
      }

      // Handle user deletion
      else if (event.type === "user.deleted") {
        const { id } = event.data;

        await database.delete(users).where(eq(users.clerkId, id));
        logger.systemEvent("User deleted via webhook", {
          requestId: context.requestId,
          clerkId: id,
          eventType: "user.deleted",
        });
      }

      // Handle user email update
      else if (event.type === "user.updated") {
        const { id, email_addresses } = event.data;
        const primaryEmail = email_addresses?.[0]?.email_address;

        if (primaryEmail) {
          await database
            .update(users)
            .set({ email: primaryEmail })
            .where(eq(users.clerkId, id));

          logger.userAction("User email updated via webhook", id, {
            requestId: context.requestId,
            clerkId: id,
            newEmail: primaryEmail,
            eventType: "user.updated",
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
