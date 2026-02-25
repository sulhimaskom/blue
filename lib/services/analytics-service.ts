/**
 * Analytics Service - Central analytics tracking infrastructure
 *
 * Provides a unified interface for tracking user events across the application.
 * Supports multiple analytics providers through a pluggable interface.
 *
 * Current Implementation:
 * - Console provider (development debugging)
 * - No-op provider (analytics disabled)
 *
 * Future Integration Points:
 * - PostHog: npm install posthog-node
 * - Mixpanel: npm install mixpanel
 * - Amplitude: npm install amplitude-node
 *
 * Usage:
 *   import { analytics } from '@/lib/services/analytics-service';
 *   analytics.track('button_clicked', { buttonId: 'create-blueprint' });
 */

import {
  AnalyticsProvider,
  AnalyticsConfig,
  AnalyticsEventName,
  UserIdentity,
  PageViewContext,
  defaultAnalyticsConfig,
  getEventCategory,
} from '@/lib/types/analytics';
import { logger } from '@/lib/logger';

/**
 * Generate a simple UUID-like string
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Console Analytics Provider - Logs events to console for development
 * Used when analytics is disabled or in development mode
 */
class ConsoleAnalyticsProvider implements AnalyticsProvider {
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  track(eventName: string, properties?: Record<string, unknown>): void {
    if (this.debug) {
      logger.debug(`[Analytics] Track: ${eventName}`, { properties });
    }
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (this.debug) {
      logger.debug(`[Analytics] Identify: ${userId}`, { traits });
    }
  }

  pageView(pagePath: string, pageTitle?: string): void {
    if (this.debug) {
      logger.debug(`[Analytics] PageView: ${pagePath} - ${pageTitle}`);
    }
  }

  reset(): void {
    if (this.debug) {
      logger.debug('[Analytics] Reset');
    }
  }
}

/**
 * No-Op Analytics Provider - Production-safe null implementation
 * Used when no analytics provider is configured
 */
class NoopAnalyticsProvider implements AnalyticsProvider {
  track(_eventName: string, _properties?: Record<string, unknown>): void {
    // No-op - analytics disabled
  }

  identify(_userId: string, _traits?: Record<string, unknown>): void {
    // No-op - analytics disabled
  }

  pageView(_pagePath: string, _pageTitle?: string): void {
    // No-op - analytics disabled
  }

  reset(): void {
    // No-op - analytics disabled
  }
}

/**
 * Analytics Service - Main entry point for analytics tracking
 *
 * This service provides a centralized way to track user events.
 * It's designed to be provider-agnostic - swap providers without changing calling code.
 *
 * Features:
 * - Automatic event categorization
 * - Timestamp injection
 * - User/session tracking
 * - Development debugging
 * - Production-safe defaults
 */
class AnalyticsService {
  private provider: AnalyticsProvider;
  private config: AnalyticsConfig;
  private currentUser: UserIdentity | null = null;
  private sessionId: string;

  constructor(config: AnalyticsConfig = defaultAnalyticsConfig) {
    this.config = config;
    this.sessionId = generateId();

    // Initialize provider based on config
    if (!config.enabled) {
      this.provider = new NoopAnalyticsProvider();
    } else if (config.debug || config.provider === 'console') {
      this.provider = new ConsoleAnalyticsProvider(config.debug);
    } else {
      // Future: Initialize PostHog/Mixpanel/Amplitude here
      // For now, fall back to console in production when no provider configured
      this.provider = new ConsoleAnalyticsProvider(false);
    }
  }

  /**
   * Track a custom event
   *
   * @param eventName - The name of the event
   * @param properties - Optional properties to attach to the event
   *
   * Example:
   *   analytics.track('button_clicked', { buttonId: 'create-blueprint' });
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    // Skip if analytics disabled
    if (!this.config.enabled && this.config.provider === 'noop') {
      return;
    }

    // Apply sampling if configured
    if (this.config.sampleRate && Math.random() > this.config.sampleRate) {
      return;
    }

    // Build enriched properties
    const enrichedProperties: Record<string, unknown> = {
      ...properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      category: getEventCategory(eventName as AnalyticsEventName),
    };

    // Add user info if available
    if (this.currentUser) {
      enrichedProperties.userId = this.currentUser.userId;
      enrichedProperties.subscriptionTier = this.currentUser.subscriptionTier;
    }

    this.provider.track(eventName, enrichedProperties);
  }

  /**
   * Identify a user with their traits
   *
   * @param user - User identity and traits
   *
   * Example:
   *   analytics.identify({ userId: 'user_123', email: 'user@example.com', subscriptionTier: 'pro' });
   */
  identify(user: UserIdentity): void {
    this.currentUser = user;

    if (!this.config.enabled && this.config.provider === 'noop') {
      return;
    }

    const traits = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      subscriptionTier: user.subscriptionTier,
      teamId: user.teamId,
      createdAt: user.createdAt,
    };

    this.provider.identify(user.userId, traits);
  }

  /**
   * Track a page view
   *
   * @param context - Page context information
   *
   * Example:
   *   analytics.pageView({ path: '/dashboard', title: 'Dashboard' });
   */
  pageView(context: PageViewContext): void {
    if (!this.config.enabled && this.config.provider === 'noop') {
      return;
    }

    this.provider.pageView(context.path, context.title);
  }

  /**
   * Track button click with enhanced properties
   *
   * @param buttonId - Unique identifier for the button
   * @param location - Where the button is located
   * @param additionalProps - Additional properties
   */
  trackButtonClick(
    buttonId: string,
    location?: string,
    additionalProps?: Record<string, unknown>
  ): void {
    this.track('button_clicked', {
      buttonId,
      elementType: 'button',
      location,
      ...additionalProps,
    });
  }

  /**
   * Track blueprint-related events
   *
   * @param eventType - Type of blueprint event
   * @param blueprintData - Blueprint-specific data
   */
  trackBlueprintEvent(
    eventType: 'created' | 'saved' | 'deployed' | 'shared',
    blueprintData: {
      blueprintId: string;
      blueprintName?: string;
      category?: string;
      complexity?: 'simple' | 'medium' | 'complex';
      generationTimeMs?: number;
    }
  ): void {
    const eventMap: Record<string, AnalyticsEventName> = {
      created: 'blueprint_created',
      saved: 'blueprint_saved',
      deployed: 'blueprint_deployed',
      shared: 'blueprint_shared',
    };

    this.track(eventMap[eventType], blueprintData);
  }

  /**
   * Track conversion funnel events
   *
   * @param step - Current step in the funnel
   * @ properties - Additional funnel-specific properties
   */
  trackConversion(step: string, properties?: Record<string, unknown>): void {
    const conversionEvents: Record<string, AnalyticsEventName> = {
      signup_completed: 'signup_completed',
      email_verified: 'email_verified',
      first_blueprint: 'first_blueprint_generated',
      subscription_upgraded: 'subscription_upgraded',
      credits_purchased: 'credits_purchased',
    };

    const eventName = conversionEvents[step];
    if (eventName) {
      this.track(eventName, properties);
    }
  }

  /**
   * Track onboarding progress
   *
   * @param milestone - The onboarding milestone achieved
   */
  trackOnboardingMilestone(milestone: string): void {
    const milestoneEvents: Record<string, AnalyticsEventName> = {
      signup: 'signup_completed',
      firstBlueprint: 'first_blueprint_generated',
      featureDiscovery: 'feature_discovered',
    };

    const eventName = milestoneEvents[milestone];
    if (eventName) {
      this.track(eventName, { milestone });
    }
  }

  /**
   * Track errors for debugging
   *
   * @param errorType - Type of error
   * @param errorContext - Additional error context
   */
  trackError(errorType: string, errorContext?: Record<string, unknown>): void {
    this.track('error_occurred', {
      errorType,
      ...errorContext,
    });
  }

  /**
   * Reset analytics state (call on logout)
   */
  reset(): void {
    this.currentUser = null;
    this.sessionId = generateId();
    this.provider.reset();
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserIdentity | null {
    return this.currentUser;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };

    // Re-initialize provider if needed
    if (!this.config.enabled) {
      this.provider = new NoopAnalyticsProvider();
    } else if (this.config.debug || this.config.provider === 'console') {
      this.provider = new ConsoleAnalyticsProvider(this.config.debug);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }
}

// ========================================
// Singleton Instance
// ========================================

// Create singleton instance with config from environment
const analyticsConfig: AnalyticsConfig = {
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV !== 'production',
  provider: (process.env.ANALYTICS_PROVIDER as AnalyticsConfig['provider']) || 'noop',
  sampleRate: parseFloat(process.env.ANALYTICS_SAMPLE_RATE || '1.0'),
};

export const analytics = new AnalyticsService(analyticsConfig);

// Export individual functions for convenience
export const {
  track,
  identify,
  pageView,
  trackButtonClick,
  trackBlueprintEvent,
  trackConversion,
  trackOnboardingMilestone,
  trackError,
  reset,
  getSessionId,
  getCurrentUser,
  updateConfig,
  getConfig,
} = analytics;
