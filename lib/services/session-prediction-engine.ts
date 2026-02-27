import { userBehaviorTracker, type UserBehaviorMetrics } from './user-behavior-tracker';
import { automatedCacheWarmingService } from './automated-cache-warming';
import { logger } from '../logger';
import { Features } from '../utils/environment';
import { type AIPatternType } from './ai-pattern-types';
import { analytics as analyticsService } from './analytics-service';

/**
 * Session Prediction Engine
 * Uses user behavior patterns to predict next pages and trigger cache warming
 * Feature: Issue #763 - Predictive Cache Warming
 */

export interface PredictionResult {
  currentPage: string;
  predictedPages: string[];
  cacheKeysToWarm: string[];
  confidence: number;
  triggered: boolean;
}

export interface PredictionMetrics {
  predictionsMade: number;
  predictionsSuccessful: number;
  cacheWarmingTriggered: number;
  averageConfidence: number;
  lastPrediction: number;
}

/**
 * Confidence threshold for triggering cache warming
 * Only warm cache if prediction confidence is above this threshold
 */
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Maximum number of pages to predict
 */
const MAX_PREDICTIONS = 3;

class SessionPredictionEngine {
  private static metrics: PredictionMetrics = {
    predictionsMade: 0,
    predictionsSuccessful: 0,
    cacheWarmingTriggered: 0,
    averageConfidence: 0,
    lastPrediction: 0,
  };

  /**
   * Predict next pages and optionally trigger cache warming
   * This is called when a user visits a page to predict where they might go next
   */
  static async predictAndWarm(
    currentPage: string,
    triggerWarming: boolean = true
  ): Promise<PredictionResult> {
    if (!Features.predictiveCacheWarming) {
      return {
        currentPage,
        predictedPages: [],
        cacheKeysToWarm: [],
        confidence: 0,
        triggered: false,
      };
    }

    const startTime = Date.now();

    try {
      // Get predicted next pages based on transition history
      const predictedPages = await userBehaviorTracker.getPredictedNextPages(
        currentPage,
        MAX_PREDICTIONS
      );

      this.metrics.predictionsMade++;

      // Track prediction attempt via analytics
      try {
        analyticsService.track('prediction_made', {
          currentPage,
          predictedCount: predictedPages.length,
          confidence: 0, // Will be calculated below
          timestamp: Date.now(),
        });
      } catch (e) {
        // Analytics failure should not block prediction
      }

      if (predictedPages.length === 0) {
        logger.debug('No predictions available for page', { currentPage });
        return {
          currentPage,
          predictedPages: [],
          cacheKeysToWarm: [],
          confidence: 0,
          triggered: false,
        };
      }

      // Calculate confidence based on number of predictions
      // More predictions = lower confidence per prediction
      const confidence = Math.min(1.0, predictedPages.length / MAX_PREDICTIONS);

      // Get cache keys for predicted pages
      const cacheKeysToWarm =
        await userBehaviorTracker.getCacheKeysForPredictedPages(predictedPages);

      // Trigger cache warming if confidence is high enough and requested
      let triggered = false;
      if (triggerWarming && confidence >= CONFIDENCE_THRESHOLD && cacheKeysToWarm.length > 0) {
        triggered = await this.triggerCacheWarming(cacheKeysToWarm);
      }

      this.metrics.predictionsSuccessful++;
      this.metrics.averageConfidence =
        (this.metrics.averageConfidence * (this.metrics.predictionsSuccessful - 1) + confidence) /
        this.metrics.predictionsSuccessful;

      if (triggered) {
        this.metrics.cacheWarmingTriggered++;
        // Track cache warming via analytics
        try {
          analyticsService.track('cache_warming_triggered', {
            currentPage,
            predictedPages,
            cacheKeysCount: cacheKeysToWarm.length,
            confidence,
            timestamp: Date.now(),
          });
        } catch (e) {
          // Analytics failure should not block prediction
        }
      }

      this.metrics.lastPrediction = Date.now();

      logger.info('Prediction completed', {
        currentPage,
        predictedPages,
        cacheKeysToWarm: cacheKeysToWarm.length,
        confidence: confidence.toFixed(2),
        triggered,
        duration: Date.now() - startTime,
      });

      return {
        currentPage,
        predictedPages,
        cacheKeysToWarm,
        confidence,
        triggered,
      };
    } catch (error) {
      logger.error('Prediction failed', {
        currentPage,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });

      return {
        currentPage,
        predictedPages: [],
        cacheKeysToWarm: [],
        confidence: 0,
        triggered: false,
      };
    }
  }

  /**
   * Trigger cache warming for predicted cache keys
   */
  private static async triggerCacheWarming(cacheKeys: string[]): Promise<boolean> {
    try {
      // Map cache keys to pattern types expected by automatedCacheWarmingService
      const patterns = this.mapCacheKeysToPatterns(cacheKeys);

      if (patterns.length === 0) {
        return false;
      }

      // Trigger on-demand warming
      const result = await automatedCacheWarmingService.performOnDemandWarming(patterns);

      logger.info('Cache warming triggered for predictions', {
        patterns,
        warmedEntries: result.warmedEntries,
        success: result.success,
      });

      return result.success;
    } catch (error) {
      logger.error('Failed to trigger cache warming', {
        cacheKeys,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Map cache keys to pattern types for the warming service
   */
  private static mapCacheKeysToPatterns(cacheKeys: string[]): AIPatternType[] {
    const patterns: Set<AIPatternType> = new Set();

    for (const key of cacheKeys) {
      const lowerKey = key.toLowerCase();

      if (lowerKey.includes('blueprint')) {
        patterns.add('marketplace'); // Use common pattern as proxy
      } else if (lowerKey.includes('project')) {
        patterns.add('dashboard');
      } else if (lowerKey.includes('credits') || lowerKey.includes('subscription')) {
        patterns.add('api-service');
      } else if (lowerKey.includes('activity') || lowerKey.includes('notification')) {
        patterns.add('dashboard');
      } else if (lowerKey.includes('teams')) {
        patterns.add('saas');
      }
    }

    return Array.from(patterns);
  }

  /**
   * Track when a user visits a page - used to validate predictions
   * Call this when a page view occurs to measure prediction accuracy
   */
  static async validatePrediction(userId: string, visitedPage: string): Promise<boolean> {
    if (!Features.predictiveCacheWarming) {
      return false;
    }

    try {
      // Get recent predictions for this user's session
      const predictions = await userBehaviorTracker.getPredictedNextPages(visitedPage, 5);

      if (predictions.length === 0) {
        return false;
      }

      // Check if the visited page was predicted
      const wasPredicted = predictions.includes(visitedPage);

      // Track prediction accuracy via analytics
      try {
        analyticsService.track('prediction_validated', {
          visitedPage,
          wasPredicted,
          predictions,
          predictionCount: predictions.length,
          timestamp: Date.now(),
        });
      } catch (e) {
        // Analytics failure should not block functionality
      }

      return wasPredicted;
    } catch (error) {
      logger.debug('Failed to validate prediction', { visitedPage, error });
      return false;
    }
  }

  /**
   * Get current prediction metrics
   */
  static getMetrics(): PredictionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get combined metrics (behavior + prediction)
   */
  static async getCombinedMetrics(): Promise<{
    prediction: PredictionMetrics;
    behavior: UserBehaviorMetrics;
  }> {
    const behavior = await userBehaviorTracker.getMetrics();
    return {
      prediction: this.getMetrics(),
      behavior,
    };
  }

  /**
   * Reset metrics (for testing)
   */
  static resetMetrics(): void {
    this.metrics = {
      predictionsMade: 0,
      predictionsSuccessful: 0,
      cacheWarmingTriggered: 0,
      averageConfidence: 0,
      lastPrediction: 0,
    };
  }

  /**
   * Periodic cleanup of old behavior data
   */
  static async performMaintenance(): Promise<void> {
    if (!Features.predictiveCacheWarming) {
      return;
    }

    try {
      await userBehaviorTracker.cleanup();

      logger.info('Session prediction engine maintenance completed', {
        metrics: this.getMetrics(),
      });
    } catch (error) {
      logger.error('Maintenance failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const sessionPredictionEngine = SessionPredictionEngine;
