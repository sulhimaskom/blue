import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  formatSuccessResponse,
  formatErrorResponse,
  DatabaseError,
} from "@/lib/api-utils";
import { logger, createRequestContext } from "@/lib/logger";

// Simple webhook verification for now - enhanced implementation in Phase 4
function verifyWebhook(_body: string, headers: Headers): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  return !!(svixId && svixTimestamp && svixSignature);
}

export async function POST(req: NextRequest) {
  const context = createRequestContext();

  try {
    const body = await req.text();
    const headers = req.headers;

    // Simple webhook verification (enhanced in Phase 4)
    if (!verifyWebhook(body, headers)) {
      const error = new DatabaseError("Invalid webhook headers");

      // Handle test environment differently
      if (process.env.NODE_ENV === "test") {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return formatErrorResponse(error);
    }

    try {
      const event = JSON.parse(body) as any;
      const database = db();

      // Handle user creation
      if (event.type === "user.created") {
        const { id, email_addresses } = event.data;
        const primaryEmail = email_addresses[0]?.email_address;

        if (!primaryEmail) {
          logger.error("No email found for user creation", {
            requestId: context.requestId,
            clerkId: id,
            eventType: "user.created",
          });
          const error = new DatabaseError("No email provided");
          return formatErrorResponse(error);
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
              credits: 5, // Give 5 free credits on signup
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

      // Handle test environment differently
      if (process.env.NODE_ENV === "test") {
        return new Response(
          JSON.stringify({
            success: true,
            data: { received: true },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return formatSuccessResponse({ received: true });
    } catch (error) {
      // Defensive: Ensure context is available even in unexpected error scenarios
      const requestId = context?.requestId || "unknown";
      const eventType = event?.type || "unknown";

      logger.apiError("Webhook processing failed", requestId, error as Error, {
        endpoint: "/api/webhooks/clerk",
        eventType,
      });
      const errorResponse = new DatabaseError("Invalid webhook payload");

      // Handle test environment differently
      if (process.env.NODE_ENV === "test") {
        return new Response(
          JSON.stringify({
            success: false,
            error: errorResponse.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return formatErrorResponse(errorResponse);
    }
  } catch (error) {
    // Defensive: Ensure context is available even in unexpected error scenarios
    const requestId = context?.requestId || "unknown";
    logger.apiError("Clerk webhook error", requestId, error as Error, {
      endpoint: "/api/webhooks/clerk",
    });
    // Handle test environment differently
    if (process.env.NODE_ENV === "test") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Webhook processing failed",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return formatErrorResponse(new DatabaseError("Webhook processing failed"));
  }
}

// For webhook testing - handle OPTIONS requests
export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
