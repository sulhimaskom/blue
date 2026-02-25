/**
 * useAnalytics - Client-side analytics tracking hook
 *
 * Provides React hook interface for tracking user events in components.
 * Wraps the analytics service with React-friendly APIs.
 *
 * Usage:
 *   const { track, identify, pageView, trackButton } = useAnalytics();
 *
 *   // Track a button click
 *   trackButton('create-blueprint', 'main-header');
 *
 *   // Track a custom event
 *   track('blueprint_created', { blueprintId: '123' });
 */

'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/lib/services/analytics-service';
import {
  AnalyticsEventName,
  UserIdentity,
  PageViewContext,
} from '@/lib/types/analytics';

/**
 * Hook for tracking user events throughout the application
 *
 * Provides easy-to-use methods for common tracking scenarios:
 * - Button clicks
 * - Page views
 * - Custom events
 * - User identification
 */
export function useAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Track a custom analytics event
   */
  const track = useCallback(
    (eventName: AnalyticsEventName, properties?: Record<string, unknown>) => {
      analytics.track(eventName, properties);
    },
    []
  );

  /**
   * Track a button click with automatic enrichment
   */
  const trackButton = useCallback(
    (buttonId: string, location?: string, additionalProps?: Record<string, unknown>) => {
      analytics.trackButtonClick(buttonId, location, {
        ...additionalProps,
        pagePath: pathname,
      });
    },
    [pathname]
  );

  /**
   * Track a blueprint-related event
   */
  const trackBlueprint = useCallback(
    (
      eventType: 'created' | 'saved' | 'deployed' | 'shared',
      blueprintData: {
        blueprintId: string;
        blueprintName?: string;
        category?: string;
        complexity?: 'simple' | 'medium' | 'complex';
        generationTimeMs?: number;
      }
    ) => {
      analytics.trackBlueprintEvent(eventType, blueprintData);
    },
    []
  );

  /**
   * Track a conversion event
   */
  const trackConversion = useCallback(
    (step: string, properties?: Record<string, unknown>) => {
      analytics.trackConversion(step, properties);
    },
    []
  );

  /**
   * Track onboarding milestone
   */
  const trackOnboarding = useCallback((milestone: string) => {
    analytics.trackOnboardingMilestone(milestone);
  }, []);

  /**
   * Track errors
   */
  const trackError = useCallback(
    (errorType: string, errorContext?: Record<string, unknown>) => {
      analytics.trackError(errorType, {
        ...errorContext,
        pagePath: pathname,
      });
    },
    [pathname]
  );

  /**
   * Identify a user
   */
  const identify = useCallback((user: UserIdentity) => {
    analytics.identify(user);
  }, []);

  /**
   * Track a page view
   */
  const pageView = useCallback((context?: Partial<PageViewContext>) => {
    analytics.pageView({
      path: context?.path || '',
      title: context?.title || '',
      referrer: context?.referrer,
      utmSource: context?.utmSource,
      utmMedium: context?.utmMedium,
      utmCampaign: context?.utmCampaign,
    });
  }, []);

  /**
   * Reset analytics on logout
   */
  const reset = useCallback(() => {
    analytics.reset();
  }, []);

  // Auto-track page views on route change
  useEffect(() => {
    if (pathname) {
      const utmSource = searchParams?.get('utm_source') || undefined;
      const utmMedium = searchParams?.get('utm_medium') || undefined;
      const utmCampaign = searchParams?.get('utm_campaign') || undefined;

      analytics.pageView({
        path: pathname,
        title: document.title || '',
        referrer: document.referrer || undefined,
        utmSource,
        utmMedium,
        utmCampaign,
      });
    }
  }, [pathname, searchParams]);

  return {
    // Core tracking
    track,
    trackButton,
    trackBlueprint,
    trackConversion,
    trackOnboarding,
    trackError,

    // User identification
    identify,

    // Page tracking
    pageView,

    // Session management
    reset,

    // Convenience getters
    sessionId: analytics.getSessionId(),
  };
}

/**
 * Hook for tracking feature discovery
 *
 * Tracks when users discover new features for the first time.
 * Helps measure onboarding effectiveness.
 *
 * Usage:
 *   const { markFeatureDiscovered, hasDiscovered } = useFeatureDiscovery();
 *
 *   // Check if feature already discovered
 *   if (!hasDiscovered('ai-chat')) {
 *     markFeatureDiscovered('ai-chat');
 *   }
 */
export function useFeatureDiscovery() {
  const trackFeatureDiscovery = useCallback((featureId: string) => {
    // Check if already discovered in this session
    const sessionKey = `feature_discovered_${featureId}`;
    const discovered = sessionStorage.getItem(sessionKey);

    if (!discovered) {
      // First time discovery
      sessionStorage.setItem(sessionKey, 'true');
      analytics.track('feature_discovered', {
        featureId,
        timestamp: Date.now(),
      });
    }
  }, []);

  const hasDiscovered = useCallback((featureId: string): boolean => {
    const sessionKey = `feature_discovered_${featureId}`;
    return sessionStorage.getItem(sessionKey) === 'true';
  }, []);

  const resetDiscovery = useCallback((featureId?: string) => {
    if (featureId) {
      sessionStorage.removeItem(`feature_discovered_${featureId}`);
    } else {
      // Clear all feature discovery flags
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('feature_discovered_'))
        .forEach((key) => sessionStorage.removeItem(key));
    }
  }, []);

  return {
    markFeatureDiscovered: trackFeatureDiscovery,
    hasDiscovered,
    resetDiscovery,
  };
}

/**
 * Hook for tracking conversion funnels
 *
 * Provides structured way to track users through conversion funnels.
 *
 * Usage:
 *   const funnel = useFunnelTracker('signup');
 *   funnel.stepCompleted('email_verified');
 */
export function useFunnelTracker(funnelName: string) {
  const trackStep = useCallback(
    (stepName: string, properties?: Record<string, unknown>) => {
      analytics.trackConversion(`${funnelName}_${stepName}`, {
        funnel: funnelName,
        ...properties,
      });
    },
    [funnelName]
  );

  const stepCompleted = useCallback(
    (stepName: string, properties?: Record<string, unknown>) => {
      trackStep(stepName, {
        ...properties,
        completedAt: Date.now(),
      });
    },
    [trackStep]
  );

  const trackFunnelStart = useCallback(() => {
    analytics.trackConversion(funnelName, {
      funnelStartedAt: Date.now(),
    });
  }, [funnelName]);

  const trackFunnelComplete = useCallback(
    (properties?: Record<string, unknown>) => {
      analytics.trackConversion(`${funnelName}_complete`, {
        ...properties,
        completedAt: Date.now(),
      });
    },
    [funnelName]
  );

  return {
    trackStep,
    stepCompleted,
    trackFunnelStart,
    trackFunnelComplete,
  };
}
