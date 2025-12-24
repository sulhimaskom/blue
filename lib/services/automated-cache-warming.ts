import { AIPatternDetector, type AIPattern } from "./ai-pattern-detector";
import { logger } from "../logger";

/**
 * Automated Cache Warming Service
 * Provides intelligent, proactive cache warming for optimal performance and cost savings
 */
export interface WarmingSchedule {
  interval: number; // minutes
  patterns: AIPattern["type"][];
  priority: "high" | "medium" | "low";
  enabled: boolean;
}

export interface WarmingMetrics {
  lastRun: number;
  warmedEntries: number;
  estimatedSavings: number;
  hitRateImprovement: number;
  patternsWarmed: AIPattern["type"][];
  duration: number;
}

class AutomatedCacheWarmingService {
  private static readonly WARMING_SCHEDULES: WarmingSchedule[] = [
    {
      interval: 5, // Every 5 minutes - high frequency
      patterns: ["marketplace", "ecommerce", "social"], // Most common patterns
      priority: "high",
      enabled: true,
    },
    {
      interval: 15, // Every 15 minutes - medium frequency
      patterns: ["dashboard", "api-service", "mobile-app"], // Common patterns
      priority: "medium",
      enabled: true,
    },
    {
      interval: 60, // Every hour - comprehensive warming
      patterns: [
        "marketplace",
        "ecommerce",
        "social",
        "dashboard",
        "api-service",
        "mobile-app",
      ], // All patterns
      priority: "low",
      enabled: true,
    },
  ];

  private static warmingInterval: NodeJS.Timeout | null = null;
  private static metrics: WarmingMetrics = {
    lastRun: 0,
    warmedEntries: 0,
    estimatedSavings: 0,
    hitRateImprovement: 0,
    patternsWarmed: [],
    duration: 0,
  };

  /**
   * Start the automated warming service
   */
  static start(): void {
    if (this.warmingInterval) {
      logger.warn("Automated cache warming service already running");
      return;
    }

    logger.info("Starting automated cache warming service");

    // Run initial warming
    this.performScheduledWarming().catch((error) => {
      logger.error("Initial cache warming failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });

    // Schedule periodic warming based on priority
    this.warmingInterval = setInterval(
      () => {
        this.performScheduledWarming().catch((error) => {
          logger.error("Scheduled cache warming failed", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
        });
      },
      Math.min(
        ...this.WARMING_SCHEDULES.filter((s) => s.enabled).map(
          (s) => s.interval * 60 * 1000,
        ),
      ),
    );

    logger.info("Automated cache warming service started", {
      schedulesCount: this.WARMING_SCHEDULES.filter((s) => s.enabled).length,
      intervalMinutes: Math.min(
        ...this.WARMING_SCHEDULES.filter((s) => s.enabled).map(
          (s) => s.interval,
        ),
      ),
    });
  }

  /**
   * Stop the automated warming service
   */
  static stop(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
      logger.info("Automated cache warming service stopped");
    }
  }

  /**
   * Perform scheduled warming based on current time and schedules
   */
  private static async performScheduledWarming(): Promise<void> {
    const startTime = Date.now();
    const currentMinute = Math.floor(startTime / 60000);

    // Determine which schedules should run now
    const activeSchedules = this.WARMING_SCHEDULES.filter(
      (schedule) => schedule.enabled && currentMinute % schedule.interval === 0,
    );

    if (activeSchedules.length === 0) {
      return;
    }

    logger.info("Performing scheduled cache warming", {
      activeSchedules: activeSchedules.length,
      patterns: activeSchedules.flatMap((s) => s.patterns),
    });

    try {
      // Combine patterns from all active schedules
      const allPatterns = [
        ...new Set(activeSchedules.flatMap((s) => s.patterns)),
      ];

      // Generate mock recent requests for pattern analysis
      const mockRecentRequests = this.generateMockRecentRequests(allPatterns);

      // Perform intelligent warming
      const warmingResult =
        await AIPatternDetector.performIntelligentWarming(mockRecentRequests);

      // Update metrics
      this.metrics = {
        lastRun: startTime,
        warmedEntries: warmingResult.warmedRules,
        estimatedSavings: warmingResult.estimatedSavings,
        hitRateImprovement: this.calculateHitRateImprovement(),
        patternsWarmed: warmingResult.patternsDetected,
        duration: Date.now() - startTime,
      };

      logger.info("Scheduled cache warming completed", this.metrics);
    } catch (error) {
      logger.error("Scheduled cache warming failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Generate mock recent requests for pattern analysis
   */
  private static generateMockRecentRequests(
    patterns: AIPattern["type"][],
  ): string[] {
    const requestTemplates: Record<AIPattern["type"], string[]> = {
      marketplace: [
        "Build a multi-vendor marketplace platform",
        "Create an online marketplace for sellers",
        "Etsy-style marketplace with commission system",
        "Amazon-like marketplace with product listings",
      ],
      ecommerce: [
        "Build an online shopping platform",
        "Create an ecommerce store with payments",
        "Shopify-style shopping cart system",
        "Online retail with inventory management",
      ],
      social: [
        "Build a social networking platform",
        "Create a social media app with features",
        "Instagram-style social feed app",
        "Community platform with messaging",
      ],
      dashboard: [
        "Build an analytics dashboard",
        "Create admin dashboard for data",
        "Monitoring dashboard with metrics",
        "Business intelligence dashboard",
      ],
      "api-service": [
        "Build a REST API service",
        "Create backend service for app",
        "Microservice architecture API",
        "B2B integration service",
      ],
      "mobile-app": [
        "Build a mobile application",
        "Create iOS and Android app",
        "React Native mobile platform",
        "Cross-platform mobile app",
      ],
      fintech: [
        "Build a fintech payment platform",
        "Create investment trading app",
        "Banking app with financial services",
        "Cryptocurrency trading platform",
      ],
      healthcare: [
        "Build a telemedicine platform",
        "Create patient management system",
        "Healthcare app with HIPAA compliance",
        "Medical records management system",
      ],
      edtech: [
        "Build online education platform",
        "Create e-learning management system",
        "Student portal with courses",
        "Online training platform",
      ],
      realestate: [
        "Build real estate management platform",
        "Create property listing website",
        "Rental management application",
        "Real estate CRM system",
      ],
      logistics: [
        "Build logistics management system",
        "Create fleet tracking platform",
        "Supply chain management software",
        "Delivery app with route optimization",
      ],
      saas: [
        "Build B2B SaaS platform",
        "Create enterprise software solution",
        "Multi-tenant business application",
        "Subscription management platform",
      ],
    };

    return patterns.flatMap(
      (pattern: AIPattern["type"]) => requestTemplates[pattern].slice(0, 2), // Take 2 templates per pattern
    );
  }

  /**
   * Calculate hit rate improvement from warming
   */
  private static calculateHitRateImprovement(): number {
    // This would be enhanced with actual hit rate tracking
    // For now, estimate improvement based on warmed entries
    const warmingBonus = this.metrics.warmedEntries * 0.02; // 2% improvement per warmed entry
    return Math.min(warmingBonus, 0.25); // Cap at 25% improvement
  }

  /**
   * Get current warming metrics
   */
  static getMetrics(): WarmingMetrics {
    return { ...this.metrics };
  }

  /**
   * Perform on-demand warming for specific patterns
   */
  static async performOnDemandWarming(patterns: AIPattern["type"][]): Promise<{
    success: boolean;
    warmedEntries: number;
    estimatedSavings: number;
    error?: string;
  }> {
    try {
      logger.info("Performing on-demand cache warming", { patterns });

      const mockRequests = this.generateMockRecentRequests(patterns);
      const result =
        await AIPatternDetector.performIntelligentWarming(mockRequests);

      logger.info("On-demand cache warming completed", {
        patterns,
        warmedRules: result.warmedRules,
        estimatedSavings: result.estimatedSavings,
      });

      return {
        success: true,
        warmedEntries: result.warmedRules,
        estimatedSavings: result.estimatedSavings,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("On-demand cache warming failed", {
        patterns,
        error: errorMessage,
      });

      return {
        success: false,
        warmedEntries: 0,
        estimatedSavings: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Get warming service status
   */
  static getStatus(): {
    running: boolean;
    schedules: WarmingSchedule[];
    lastWarming: number;
    nextWarming: number;
  } {
    const now = Date.now();
    const nextWarming = this.warmingInterval
      ? now +
        Math.min(
          ...this.WARMING_SCHEDULES.filter((s) => s.enabled).map(
            (s) => s.interval,
          ),
        ) *
          60 *
          1000
      : 0;

    return {
      running: this.warmingInterval !== null,
      schedules: this.WARMING_SCHEDULES,
      lastWarming: this.metrics.lastRun,
      nextWarming,
    };
  }

  /**
   * Update warming schedules
   */
  static updateSchedules(newSchedules: Partial<WarmingSchedule>[]): void {
    // Update schedules with new configurations
    newSchedules.forEach((newSchedule, index) => {
      if (this.WARMING_SCHEDULES[index]) {
        this.WARMING_SCHEDULES[index] = {
          ...this.WARMING_SCHEDULES[index],
          ...newSchedule,
        };
      }
    });

    logger.info("Cache warming schedules updated", {
      schedulesCount: this.WARMING_SCHEDULES.length,
      enabledCount: this.WARMING_SCHEDULES.filter((s) => s.enabled).length,
    });
  }
}

// Singleton service instance
export const automatedCacheWarmingService = AutomatedCacheWarmingService;
