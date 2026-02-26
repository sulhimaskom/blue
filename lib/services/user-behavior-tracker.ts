import { redisManager } from '../redis';
import { logger } from '../logger';
import { Features } from '../utils/environment';

/**
 * User Behavior Tracker Service
 * Tracks user navigation patterns within sessions to enable predictive cache warming
 * Feature: Issue #763 - Predictive Cache Warming
 */

export interface PageTransition {
  fromPage: string;
  toPage: string;
  count: number;
  lastSeen: number;
}

export interface SessionPageHistory {
  sessionId: string;
  userId: string;
  pages: string[];
  lastPage: string;
  lastUpdate: number;
}

export interface UserBehaviorMetrics {
  activeSessions: number;
  totalTransitions: number;
  topTransitions: PageTransition[];
  averageSessionLength: number;
}

/**
 * Page to cache key mapping for predictive warming
 * Maps dashboard pages to their corresponding API cache keys
 */
const PAGE_CACHE_KEY_MAPPING: Record<string, string[]> = {
  '/dashboard': ['cache:api:projects', 'cache:api:blueprints'],
  '/dashboard/blueprints': ['cache:api:blueprints'],
  '/dashboard/projects': ['cache:api:projects'],
  '/dashboard/credits': ['cache:api:credits'],
  '/dashboard/subscription': ['cache:api:subscription:tiers'],
  '/dashboard/activity': ['cache:api:activity'],
  '/dashboard/notifications': ['cache:api:notifications'],
  '/dashboard/settings': ['cache:api:settings'],
  '/dashboard/teams': ['cache:api:teams'],
};

class UserBehaviorTracker {
  private static readonly SESSION_TTL = 3600; // 1 hour
  private static readonly TRANSITION_TTL = 86400; // 24 hours
  private static readonly MAX_PAGES_PER_SESSION = 50;
  private static readonly MIN_TRANSITIONS_FOR_PREDICTION = 3;

  /**
   * Track a page visit in the user's session
   */
  static async trackPageVisit(userId: string, sessionId: string, pagePath: string): Promise<void> {
    if (!Features.predictiveCacheWarming) {
      return;
    }

    try {
      await redisManager.executeWithFallback(
        async client => {
          // Store session page history
          const sessionKey = `user-behavior:session:${sessionId}`;
          const existingData = await client.get(sessionKey);

          let history: SessionPageHistory;
          if (existingData) {
            history = JSON.parse(existingData);
            history.pages.push(pagePath);
            // Limit pages per session
            if (history.pages.length > this.MAX_PAGES_PER_SESSION) {
              history.pages = history.pages.slice(-this.MAX_PAGES_PER_SESSION);
            }
          } else {
            history = {
              sessionId,
              userId,
              pages: [pagePath],
              lastPage: pagePath,
              lastUpdate: Date.now(),
            };
          }

          history.lastPage = pagePath;
          history.lastUpdate = Date.now();

          await client.setEx(sessionKey, this.SESSION_TTL, JSON.stringify(history));

          // Track page transition if there was a previous page
          if (history.pages.length > 1) {
            const previousPage = history.pages[history.pages.length - 2];
            if (previousPage !== pagePath) {
              await this.trackTransition(previousPage, pagePath);
            }
          }
        },
        async () => {
          logger.debug('Redis unavailable, skipping behavior tracking');
        }
      );
    } catch (error) {
      logger.error('Failed to track page visit', {
        userId,
        sessionId,
        pagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Track a page transition (from one page to another)
   */
  private static async trackTransition(fromPage: string, toPage: string): Promise<void> {
    try {
      await redisManager.executeWithFallback(
        async client => {
          const transitionKey = `user-behavior:transition:${fromPage}:${toPage}`;
          const existingData = await client.get(transitionKey);

          if (existingData) {
            const transition: PageTransition = JSON.parse(existingData);
            transition.count += 1;
            transition.lastSeen = Date.now();
            await client.setEx(transitionKey, this.TRANSITION_TTL, JSON.stringify(transition));
          } else {
            const transition: PageTransition = {
              fromPage,
              toPage,
              count: 1,
              lastSeen: Date.now(),
            };
            await client.setEx(transitionKey, this.TRANSITION_TTL, JSON.stringify(transition));
          }
        },
        async () => {}
      );
    } catch (error) {
      logger.debug('Failed to track transition', { fromPage, toPage, error });
    }
  }

  /**
   * Get predicted next pages based on current page and transition history
   */
  static async getPredictedNextPages(currentPage: string, limit: number = 3): Promise<string[]> {
    if (!Features.predictiveCacheWarming) {
      return [];
    }

    try {
      return await redisManager.executeWithFallback(
        async client => {
          // Find all transitions from current page
          const pattern = `user-behavior:transition:${currentPage}:*`;
          const keys = await client.keys(pattern);

          if (keys.length === 0) {
            return [];
          }

          const transitions: PageTransition[] = [];
          for (const key of keys) {
            const data = await client.get(key);
            if (data) {
              transitions.push(JSON.parse(data));
            }
          }

          // Sort by count (most frequent transitions first)
          transitions.sort((a, b) => b.count - a.count);

          // Filter by minimum confidence and return top predictions
          return transitions
            .filter(t => t.count >= this.MIN_TRANSITIONS_FOR_PREDICTION)
            .slice(0, limit)
            .map(t => t.toPage);
        },
        async () => []
      );
    } catch (error) {
      logger.debug('Failed to get predicted pages', { currentPage, error });
      return [];
    }
  }

  /**
   * Get cache keys that should be pre-warmed based on predicted pages
   */
  static async getCacheKeysForPredictedPages(predictedPages: string[]): Promise<string[]> {
    const cacheKeys: Set<string> = new Set();

    for (const page of predictedPages) {
      const pageKeys = PAGE_CACHE_KEY_MAPPING[page];
      if (pageKeys) {
        pageKeys.forEach(key => cacheKeys.add(key));
      }
    }

    return Array.from(cacheKeys);
  }

  /**
   * Get user behavior metrics for monitoring
   */
  static async getMetrics(): Promise<UserBehaviorMetrics> {
    try {
      return await redisManager.executeWithFallback(
        async client => {
          // Count active sessions
          const sessionKeys = await client.keys('user-behavior:session:*');
          const activeSessions = sessionKeys.length;

          // Count total transitions
          const transitionKeys = await client.keys('user-behavior:transition:*');
          const totalTransitions = transitionKeys.length;

          // Get top transitions
          const topTransitions: PageTransition[] = [];
          const limitedKeys = transitionKeys.slice(0, 20);
          for (const key of limitedKeys) {
            const data = await client.get(key);
            if (data) {
              topTransitions.push(JSON.parse(data));
            }
          }
          topTransitions.sort((a, b) => b.count - a.count);

          // Calculate average session length
          let totalPages = 0;
          let sessionsWithPages = 0;
          for (const sessionKey of sessionKeys.slice(0, 50)) {
            const data = await client.get(sessionKey);
            if (data) {
              const session = JSON.parse(data);
              if (session.pages && session.pages.length > 0) {
                totalPages += session.pages.length;
                sessionsWithPages++;
              }
            }
          }
          const averageSessionLength = sessionsWithPages > 0 ? totalPages / sessionsWithPages : 0;

          return {
            activeSessions,
            totalTransitions,
            topTransitions: topTransitions.slice(0, 10),
            averageSessionLength: Math.round(averageSessionLength * 10) / 10,
          };
        },
        async () => ({
          activeSessions: 0,
          totalTransitions: 0,
          topTransitions: [],
          averageSessionLength: 0,
        })
      );
    } catch (error) {
      logger.error('Failed to get behavior metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        activeSessions: 0,
        totalTransitions: 0,
        topTransitions: [],
        averageSessionLength: 0,
      };
    }
  }

  /**
   * Clean up old session data (called periodically)
   */
  static async cleanup(): Promise<void> {
    if (!Features.predictiveCacheWarming) {
      return;
    }

    try {
      await redisManager.executeWithFallback(
        async client => {
          // Clean up expired sessions (TTL handles this automatically)
          // But we can log cleanup activity
          const sessionKeys = await client.keys('user-behavior:session:*');
          const transitionKeys = await client.keys('user-behavior:transition:*');

          logger.info('User behavior data cleanup', {
            activeSessions: sessionKeys.length,
            activeTransitions: transitionKeys.length,
          });
        },
        async () => {}
      );
    } catch (error) {
      logger.debug('Failed to cleanup behavior data', { error });
    }
  }
}

export const userBehaviorTracker = UserBehaviorTracker;
