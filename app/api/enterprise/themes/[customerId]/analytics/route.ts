import { NextRequest } from 'next/server';
import { APIRouteHandler } from '@/lib/services/api-route-handler';
import { RateLimiters } from '@/lib/rate-limit-config';
import { logger } from '@/lib/logger';
import { enterpriseThemeService } from '@/lib/services/enterprise-theme-service';
import { AuthorizationError } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ customerId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { customerId } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.themesGet()(identifier),
    handler: async ({ context, user }) => {
      if (!user?.isAdmin && user?.email?.includes(customerId)) {
        throw new AuthorizationError('Access denied - insufficient permissions');
      }

      const result = await enterpriseThemeService.getThemeAnalytics(customerId);

      logger.info('Enterprise theme analytics retrieved', {
        requestId: context.requestId,
        userId: user?.id,
        customerId,
        success: result.success,
      });

      return result.data || null;
    },
  })(req);
}
