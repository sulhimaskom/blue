import { NextRequest } from "next/server";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import { logger } from "@/lib/logger";
import {
  formatSuccessResponse,
  formatErrorResponse,
  withRateLimiter,
} from "@/lib/api-utils";
import { performanceReportService } from "@/lib/services/performance-report-service";

export async function GET(req: NextRequest) {
  return withRateLimiter(req, "standard", async () => {
    return UnifiedCacheManager.withCache(
      req,
      async () => {
        try {
          const searchParams = req.nextUrl.searchParams;
          const includeCache = searchParams.get("includeCache") === "true";
          const includeDb = searchParams.get("includeDb") === "true";
          const detailed = searchParams.get("detailed") === "true";

          const report = await performanceReportService.generatePerformanceReport(
            {
              includeCache,
              includeDb,
              detailed,
            },
          );

          return formatSuccessResponse(report);
        } catch (error) {
          logger.error("Performance report generation failed", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return formatErrorResponse(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      },
      {
        ttl: 60,
        tags: ["performance", "monitoring", "dashboard"],
        varyBy: [],
      },
    );
  });
}
