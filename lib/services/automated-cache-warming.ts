import { AIPatternDetector, type AIPattern } from "./ai-pattern-detector";
import { logger } from "../logger";
import { optimizedIntervalManager } from "./optimized-interval-manager";

/**
 * Automated Cache Warming Service
 * Provides intelligent, proactive cache warming with optimized interval management
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

  private static metrics: WarmingMetrics = {
    lastRun: 0,
    warmedEntries: 0,
    estimatedSavings: 0,
    hitRateImprovement: 0,
    patternsWarmed: [],
    duration: 0,
  };

  /**
   * Start the automated warming service using optimized interval manager
   */
  static start(): void {
    logger.info(
      "Starting automated cache warming service with optimized intervals",
    );

    // Register each warming schedule with the interval manager
    this.WARMING_SCHEDULES.forEach((schedule, index) => {
      const intervalId = `cache-warming-${schedule.priority}-${index}`;

      optimizedIntervalManager.registerInterval(
        intervalId,
        async () => {
          await this.performWarmingForSchedule(schedule);
        },
        schedule.interval * 60 * 1000, // Convert minutes to milliseconds
        {
          enabled: schedule.enabled,
          maxRunTime: 300000, // 5 minutes max run time
          maxRetries: 2,
        },
      );

      logger.debug("Cache warming schedule registered", {
        intervalId,
        interval: schedule.interval,
        priority: schedule.priority,
        enabled: schedule.enabled,
      });
    });

    // Run initial warming for high-priority schedules
    this.WARMING_SCHEDULES.filter(
      (s) => s.enabled && s.priority === "high",
    ).forEach((schedule) => {
      this.performWarmingForSchedule(schedule).catch((error) => {
        logger.error("Initial high-priority cache warming failed", {
          priority: schedule.priority,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
    });

    logger.info("Automated cache warming service started", {
      schedulesCount: this.WARMING_SCHEDULES.filter((s) => s.enabled).length,
      intervalManagerHealth: optimizedIntervalManager.healthCheck(),
    });
  }

  /**
   * Stop the automated warming service
   */
  static stop(): void {
    logger.info("Stopping automated cache warming service");

    // Unregister all warming intervals
    this.WARMING_SCHEDULES.forEach((schedule, index) => {
      const intervalId = `cache-warming-${schedule.priority}-${index}`;
      optimizedIntervalManager.unregisterInterval(intervalId);
    });

    logger.info("Automated cache warming service stopped");
  }

  /**
   * Perform warming for specific schedule
   */
  private static async performWarmingForSchedule(
    schedule: WarmingSchedule,
  ): Promise<void> {
    const startTime = Date.now();

    logger.info("Performing cache warming for schedule", {
      priority: schedule.priority,
      interval: schedule.interval,
      patterns: schedule.patterns,
    });

    try {
      // Generate mock recent requests for pattern analysis
      const mockRecentRequests = this.generateMockRecentRequests(
        schedule.patterns,
      );

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

      logger.info("Cache warming completed for schedule", {
        priority: schedule.priority,
        warmedEntries: this.metrics.warmedEntries,
        duration: this.metrics.duration,
      });
    } catch (error) {
      logger.error("Cache warming failed for schedule", {
        priority: schedule.priority,
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
   * Reset metrics to default state (for testing)
   */
  static resetMetrics(): void {
    this.metrics = {
      lastRun: 0,
      warmedEntries: 0,
      estimatedSavings: 0,
      hitRateImprovement: 0,
      patternsWarmed: [],
      duration: 0,
    };
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
    const startTime = Date.now();
    
    try {
      logger.info("Performing on-demand cache warming", { patterns });

      const mockRequests = this.generateMockRecentRequests(patterns);
      const result =
        await AIPatternDetector.performIntelligentWarming(mockRequests);

      // Update metrics
      this.metrics.lastRun = Date.now();
      this.metrics.warmedEntries = result.warmedRules;
      this.metrics.estimatedSavings = result.estimatedSavings;
      this.metrics.patternsWarmed = patterns;
      this.metrics.hitRateImprovement = this.calculateHitRateImprovement();
      this.metrics.duration = Date.now() - startTime;

      logger.info("On-demand cache warming completed", {
        patterns,
        warmedRules: result.warmedRules,
        estimatedSavings: result.estimatedSavings,
        duration: this.metrics.duration,
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
    intervalManagerHealth: any;
  } {
    const now = Date.now();
    const nextInterval = Math.min(
      ...this.currentSchedules.filter((s) => s.enabled).map((s) => s.interval),
    );
    const nextWarming = nextInterval > 0 ? now + nextInterval * 60 * 1000 : 0;

    return {
      running: true, // Using interval manager
      schedules: this.currentSchedules,
      lastWarming: this.metrics.lastRun,
      nextWarming,
      intervalManagerHealth: optimizedIntervalManager.healthCheck(),
    };
  }

  /**
   * Update warming schedules
   */
  private static currentSchedules: WarmingSchedule[] = [...this.WARMING_SCHEDULES];

  static updateSchedules(newSchedules: Partial<WarmingSchedule>[]): void {
    // Update schedules with new configurations
    newSchedules.forEach((newSchedule, index) => {
      if (this.currentSchedules[index]) {
        this.currentSchedules[index] = {
          ...this.currentSchedules[index],
          ...newSchedule,
        };
      }
    });

    logger.info("Cache warming schedules updated", {
      schedulesCount: this.currentSchedules.length,
      enabledCount: this.currentSchedules.filter((s) => s.enabled).length,
    });
  }

  /**
   * Reset schedules to default state (for testing)
   */
  static resetSchedules(): void {
    this.currentSchedules = [...this.WARMING_SCHEDULES];
  }

  
}

// Singleton service instance
export const automatedCacheWarmingService = AutomatedCacheWarmingService;
