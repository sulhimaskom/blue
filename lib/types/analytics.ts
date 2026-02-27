/**
 * Centralized TypeScript interfaces for analytics events
 *
 * Provides type-safe analytics tracking infrastructure.
 * This is the foundation for measuring growth, conversion, and user engagement.
 *
 * Usage:
 *   import { track, identify, pageView } from '@/lib/hooks/useAnalytics';
 *   track('button_click', { buttonId: 'create-blueprint' });
 */

// ========================================
// Core Analytics Types
// ========================================

export type AnalyticsEventName =
  | 'page_viewed'
  | 'button_clicked'
  | 'blueprint_created'
  | 'blueprint_saved'
  | 'blueprint_deployed'
  | 'blueprint_shared'
  | 'signup_completed'
  | 'email_verified'
  | 'first_blueprint_generated'
  | 'subscription_upgraded'
  | 'credits_purchased'
  | 'team_invite_sent'
  | 'feature_discovered'
  | 'error_occurred'
  | 'search_performed'
  | 'prediction_made'
  | 'prediction_validated'
  | 'cache_warming_triggered';

export type UserEventCategory =
  | 'engagement'
  | 'conversion'
  | 'onboarding'
  | 'subscription'
  | 'sharing'
  | 'error';

export interface AnalyticsEventProperties {
  // Core properties (always present)
  timestamp: number;
  eventName: AnalyticsEventName;
  category: UserEventCategory;

  // User identification
  userId?: string;
  sessionId?: string;

  // Page context
  pagePath?: string;
  pageTitle?: string;
  referrer?: string;

  // Event-specific properties
  [key: string]: unknown;
}

export interface UserIdentity {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  teamId?: string;
  createdAt?: number;
}

export interface PageViewContext {
  path: string;
  title: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface ClickEventProperties {
  elementId?: string;
  elementType?: 'button' | 'link' | 'icon' | 'menu' | 'other';
  location?: string;
  pageSection?: 'header' | 'sidebar' | 'main' | 'footer' | 'modal';
}

export interface BlueprintEventProperties {
  blueprintId: string;
  blueprintName?: string;
  category?: string;
  complexity?: 'simple' | 'medium' | 'complex';
  generationTimeMs?: number;
}

export interface SubscriptionEventProperties {
  previousTier?: 'free' | 'pro' | 'enterprise';
  newTier: 'free' | 'pro' | 'enterprise';
  billingCycle?: 'monthly' | 'yearly';
  amount?: number;
  currency?: string;
}

export interface CreditPurchaseProperties {
  creditAmount: number;
  amount: number;
  currency: string;
  paymentMethod?: string;
}

// ========================================
// Analytics Provider Interface
// ========================================

export interface AnalyticsProvider {
  /**
   * Track an analytics event
   */
  track(_eventName: string, _properties?: Record<string, unknown>): void;

  /**
   * Identify a user
   */
  identify(_userId: string, _traits?: Record<string, unknown>): void;

  /**
   * Track a page view
   */
  pageView(_pagePath: string, _pageTitle?: string): void;

  /**
   * Reset/clear user identity (on logout)
   */
  reset(): void;
}

// ========================================
// Analytics Config
// ========================================

export interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  provider: 'console' | 'noop' | ' posthog' | 'mixpanel' | 'amplitude';
  sampleRate?: number;
}

export const defaultAnalyticsConfig: AnalyticsConfig = {
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV !== 'production',
  provider: 'noop',
  sampleRate: 1.0,
};

// ========================================
// Event Validation
// ========================================

export const EVENT_CATEGORIES: Record<AnalyticsEventName, UserEventCategory> = {
  page_viewed: 'engagement',
  button_clicked: 'engagement',
  blueprint_created: 'conversion',
  blueprint_saved: 'onboarding',
  blueprint_deployed: 'conversion',
  blueprint_shared: 'engagement',
  signup_completed: 'conversion',
  email_verified: 'conversion',
  first_blueprint_generated: 'onboarding',
  subscription_upgraded: 'subscription',
  credits_purchased: 'subscription',
  team_invite_sent: 'engagement',
  feature_discovered: 'onboarding',
  error_occurred: 'error',
  search_performed: 'engagement',
  prediction_made: 'engagement',
  prediction_validated: 'engagement',
  cache_warming_triggered: 'engagement',
};

export function validateEventName(eventName: string): eventName is AnalyticsEventName {
  return EVENT_CATEGORIES.hasOwnProperty(eventName);
}

export function getEventCategory(eventName: AnalyticsEventName): UserEventCategory {
  return EVENT_CATEGORIES[eventName];
}
