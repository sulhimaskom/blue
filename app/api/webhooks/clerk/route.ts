import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  formatSuccessResponse,
  formatErrorResponse,
  DatabaseError,
} from "@/lib/api-utils";

// Simple webhook verification for now - enhanced implementation in Phase 4
function verifyWebhook(_body: string, headers: Headers): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  return !!(svixId && svixTimestamp && svixSignature);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headers = req.headers;

    // Simple webhook verification (enhanced in Phase 4)
    if (!verifyWebhook(body, headers)) {
      const error = new DatabaseError("Invalid webhook headers");
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
          console.error("No email found for user creation:", id);
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

          console.log("New user created:", newUser.id);
        }
      }

      // Handle user deletion
      else if (event.type === "user.deleted") {
        const { id } = event.data;

        await database.delete(users).where(eq(users.clerkId, id));
        console.log("User deleted:", id);
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

          console.log("User email updated:", id);
        }
      }

      return formatSuccessResponse({ received: true });
    } catch (error) {
      console.error("Webhook processing failed:", error);
      const errorResponse = new DatabaseError("Invalid webhook payload");
      return formatErrorResponse(errorResponse);
    }
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return formatErrorResponse(new DatabaseError("Webhook processing failed"));
  }
}

// For webhook testing - handle OPTIONS requests
export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
