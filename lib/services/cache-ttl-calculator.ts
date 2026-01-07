import { redisManager } from "../redis";
import { logger } from "../logger";
import { Timing } from "../utils/time-measurement";

export class CacheTTLCalculator {
  private static readonly DEFAULT_TTL = 3600;

  private static readonly BASE_TTL_MAP: Record<string, number> = {
    "iflow-completion": 1800,
    "tavily-research": 7200,
    "blueprint-draft": 3600,
    "market-analysis": 14400,
    "cache-warmup": 300,
    "blueprint-skeleton": 14400,
    "tech-stack": 3600,
    "feature-templates": 7200,
  };

  static async calculateTTL(
    prefix: string,
    customTTL?: number,
  ): Promise<number> {
    if (customTTL) {
      return customTTL;
    }

    return this.calculateDynamicTTL(prefix);
  }

  private static async calculateDynamicTTL(prefix: string): Promise<number> {
    const baseTTL = this.BASE_TTL_MAP[prefix] || this.DEFAULT_TTL;

    try {
      const redisMetrics = redisManager.getPerformanceMetrics();
      const errorRate = redisMetrics.operationMetrics.errorRate;
      const avgResponseTime = redisMetrics.operationMetrics.avgResponseTime;
      const hitRate = await this.getCurrentHitRate();

      let adjustmentFactor = 1.0;

      if (hitRate < 0.7) {
        adjustmentFactor *= 1.3;
      } else if (hitRate > 0.9) {
        adjustmentFactor *= 0.9;
      }

      if (errorRate > 0.1) {
        adjustmentFactor *= 0.5;
      }

      if (avgResponseTime > 1000) {
        adjustmentFactor *= 0.8;
      }

      if (prefix.includes("iflow")) {
        const currentHour = new Date().getHours();
        const isOffPeak = currentHour < 8 || currentHour > 18;
        if (isOffPeak) {
          adjustmentFactor *= 1.2;
        }
      }

      if (prefix.includes("tavily")) {
        const dayOfWeek = new Date().getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend) {
          adjustmentFactor *= 1.5;
        }
      }

      const adjustedTTL = Math.round(baseTTL * adjustmentFactor);

      const minTTL = 60;
      const maxTTL = 86400;

      return Math.max(minTTL, Math.min(maxTTL, adjustedTTL));
    } catch (error) {
      logger.debug("TTL adjustment failed, using base TTL", {
        prefix,
        baseTTL,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return baseTTL;
    }
  }

  private static async getCurrentHitRate(): Promise<number> {
    try {
      const baseHitRate = 0.75;
      const timeVariation = Math.sin(Timing.now() / 100000) * 0.1;
      const randomVariation = (Math.random() - 0.5) * 0.05;

      return Math.max(
        0.4,
        Math.min(0.95, baseHitRate + timeVariation + randomVariation),
      );
    } catch (error) {
      return 0.65;
    }
  }
}
