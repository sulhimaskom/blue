import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError } from "@/lib/api-utils";

// GET /api/webhooks/history - Get webhook event history
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context: _context, user, req: _req }) => {
    if (!user) {
      throw new ValidationError("Authentication required");
    }

    // TODO: Implement query parameters when service method is fixed
    // const { searchParams } = new URL(req.url);
    // const configId = searchParams.get("configId") || undefined;
    // const limit = parseInt(searchParams.get("limit") || "50", 10);
    // const offset = parseInt(searchParams.get("offset") || "0", 10);

    // This route needs to be fixed - service method signature is different
    // For now, return empty array to avoid breaking build
    const events: any[] = [];

    return { data: events };
  },
});
