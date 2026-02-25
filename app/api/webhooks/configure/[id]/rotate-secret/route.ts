import { z } from 'zod';
import { APIRouteHandler } from '@/lib/services/api-route-handler';
import { WebhookConfigurationService } from '@/lib/services/webhook-configuration-service';
import { logger } from '@/lib/logger';
import { RateLimiters } from '@/lib/rate-limit-config';
import { ValidationError, NotFoundError } from '@/lib/api-utils';
import type { NextRequest } from 'next/server';

// POST /api/webhooks/configure/[id]/rotate-secret - Rotate webhook secret
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return APIRouteHandler.createPOSTHandler<Record<string, never>>({
    requireAuth: true,
    schema: z.object({}),
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context: _context, user }) => {
      if (!user) {
        throw new ValidationError('Authentication required');
      }

      const { id } = await params;

      // Verify ownership before rotating secret
      const existingConfig = await WebhookConfigurationService.getConfigurationById(user.id, id);
      if (!existingConfig) {
        throw new NotFoundError('Webhook configuration not found');
      }

      const result = await WebhookConfigurationService.rotateSecret(user.id, id);

      logger.security('webhook_secret_rotated_via_api', {
        configId: id,
        userId: user.id.toString(),
        configName: existingConfig.name,
      });

      return {
        data: result,
        message: 'Webhook secret rotated successfully',
      };
    },
  })(req);
}
