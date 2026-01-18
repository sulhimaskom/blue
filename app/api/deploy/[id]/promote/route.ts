import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { deploymentPromotionService } from "@/lib/services/deployment-promotion-service";

const promoteEnvironmentSchema = z.object({
  targetEnvironment: z.enum(["production"]),
  validationRequired: z.boolean().default(true),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPUTHandler({
    schema: promoteEnvironmentSchema,
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.strict()(identifier),
    handler: async ({ context, user, data }) => {
      return await deploymentPromotionService.promoteToProduction(
        id,
        data!.validationRequired ?? true,
        user!.id,
        user!.clerkId,
        context
      );
    },
  })(req);
}