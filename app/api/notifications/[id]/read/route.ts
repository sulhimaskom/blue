import { z } from 'zod';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { APIRouteHandler } from '@/lib/services/api-route-handler';
import { NotificationService } from '@/lib/services/notification-service';
import { RateLimiters } from '@/lib/rate-limit-config';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler<Record<string, never>>({
    requireAuth: true,
    schema: z.object({}),
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      const result = await NotificationService.markAsRead(user!.clerkId, id);

      logger.userAction('Notification marked as read', user!.clerkId, {
        requestId: context.requestId,
        notificationId: id,
      });

      return {
        notification: result.notification,
        unreadCount: result.unreadCount,
        message: 'Notification marked as read successfully',
      };
    },
  })(req);
}
