import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { ValidationError } from "@/lib/api-utils";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { UserService } from "@/lib/services/user-service";

const billingHistoryQuerySchema = z.object({
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export interface BillingTransaction {
  id: string;
  amount: number;
  creditsAdded: number | null;
  stripePaymentId: string | null;
  createdAt: string;
}

export interface BillingHistoryResponse {
  transactions: BillingTransaction[];
  totalCount: number;
  limit?: number;
  offset?: number;
}

/**
 * GET /api/subscription/billing/history
 *
 * Get billing history for the authenticated user
 *
 * Query Parameters:
 * - limit: Maximum number of transactions to return (default: 50)
 * - offset: Number of transactions to skip (for pagination)
 * - startDate: Filter transactions created on or after this date (ISO 8601 format)
 * - endDate: Filter transactions created on or before this date (ISO 8601 format)
 *
 * Rate Limit: 30 requests/minute (standard - authenticated with caching)
 * Cache: 5 minutes (billing data changes infrequently)
 */
export const GET = APIRouteHandler.createSimpleCachedGETHandler(
  async (req) => {
    const user = await UserService.getAuthenticatedUser({ requestId: "test" } as any);
    const url = new URL(req.url);
    let result: z.infer<typeof billingHistoryQuerySchema>;

    try {
      result = billingHistoryQuerySchema.parse({
        limit: url.searchParams.get("limit"),
        offset: url.searchParams.get("offset"),
        startDate: url.searchParams.get("startDate"),
        endDate: url.searchParams.get("endDate"),
      });
    } catch (error) {
      throw new ValidationError("Invalid query parameters");
    }

    const userId = user.id;
    const transactionsResult = await ProjectDataService.getUserTransactions(userId);

      let filteredTransactions = transactionsResult;

      if (result.startDate) {
        const startDate = new Date(result.startDate);
        if (isNaN(startDate.getTime())) {
          throw new ValidationError("Invalid startDate format");
        }
        filteredTransactions = filteredTransactions.filter(
          (t: { createdAt: Date | string }) => new Date(t.createdAt) >= startDate,
        );
      }

      if (result.endDate) {
        const endDate = new Date(result.endDate);
        if (isNaN(endDate.getTime())) {
          throw new ValidationError("Invalid endDate format");
        }
        filteredTransactions = filteredTransactions.filter(
          (t: { createdAt: Date | string }) => new Date(t.createdAt) <= endDate,
        );
      }

      const totalCount = filteredTransactions.length;

      const limit = result.limit || 50;
      const offset = result.offset || 0;

      const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

      const formattedTransactions = paginatedTransactions.map(
        (t: {
          id: string;
          amount: number;
          creditsAdded: number | null;
          stripePaymentId: string | null;
          createdAt: Date | string;
        }) => ({
          id: t.id,
          amount: t.amount,
          creditsAdded: t.creditsAdded,
          stripePaymentId: t.stripePaymentId,
          createdAt:
            typeof t.createdAt === "string"
              ? t.createdAt
              : t.createdAt.toISOString(),
        }),
      );

      logger.userAction("Billing history retrieved", String(userId), {
        transactionCount: totalCount,
        limit,
        offset,
      });

      return {
        transactions: formattedTransactions,
        totalCount,
        limit,
        offset,
      };
  },
  {
    ttl: 300,
    tags: ["subscription:billing"],
    varyBy: [],
    initializeServices: false,
  },
);