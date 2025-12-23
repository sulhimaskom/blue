import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DatabaseError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { WEBHOOK_EVENTS, CREDIT_RULES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  return WebhookService.processWebhook(req, {
    serviceName: "Clerk",
    verifySignature: SecurityService.verifyClerkWebhook,
    processEvent: async (event: any, context) => {
      const database = db();

      // Handle user creation
      if (event.type === WEBHOOK_EVENTS.CLERK.USER_CREATED) {
        const { id, email_addresses } = event.data;
        const primaryEmail = email_addresses[0]?.email_address;

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
      else if (event.type === WEBHOOK_EVENTS.CLERK.USER_DELETED) {
        const { id } = event.data;

        await database.delete(users).where(eq(users.clerkId, id));
        logger.systemEvent("User deleted via webhook", {
          requestId: context.requestId,
          clerkId: id,
          eventType: "user.deleted",
        });
      }

      // Handle user email update
      else if (event.type === WEBHOOK_EVENTS.CLERK.USER_UPDATED) {
        const { id, email_addresses } = event.data;
        const primaryEmail = email_addresses[0]?.email_address;

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
