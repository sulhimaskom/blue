import { z } from 'zod';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { APIRouteHandler } from '@/lib/services/api-route-handler';
import { BlueprintSharingService } from '@/lib/services/blueprint-sharing-service';
import { RateLimiters } from '@/lib/rate-limit-config';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: shareId } = await params;

  return APIRouteHandler.createPOSTHandler<Record<string, never>>({
    requireAuth: true,
    schema: z.object({}),
    rateLimiter: (identifier: string) => RateLimiters.permissive()(identifier),
    handler: async ({ context, user }) => {
      const result = await BlueprintSharingService.trackView(shareId, user!.id);

      logger.userAction('Shared blueprint view tracked', user!.clerkId, {
        requestId: context.requestId,
        shareId,
      });

      return {
        message: result.message,
      };
    },
  })(req);
}
