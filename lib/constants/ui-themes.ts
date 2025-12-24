/**
 * Centralized UI Theme System
 *
 * Eliminates hardcoded color values across all components
 * Follows blueprint.md principle: No hardcoded strings
 *
 * Usage: Import themes from this file, never hardcode colors directly
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Status Themes - Used across indicators, badges, and alerts
 */
export const STATUS_THEMES = {
  healthy: {
    text: "text-green-700",
    background: "bg-green-50",
    border: "border-green-200",
    accent: "bg-green-500",
    combined: "text-green-700 bg-green-50 border-green-200",
  },
  degraded: {
    text: "text-yellow-700",
    background: "bg-yellow-50",
    border: "border-yellow-200",
    accent: "bg-yellow-500",
    combined: "text-yellow-700 bg-yellow-50 border-yellow-200",
  },
  unhealthy: {
    text: "text-red-700",
    background: "bg-red-50",
    border: "border-red-200",
    accent: "bg-red-500",
    combined: "text-red-700 bg-red-50 border-red-200",
  },
  neutral: {
    text: "text-gray-700",
    background: "bg-gray-50",
    border: "border-gray-200",
    accent: "bg-gray-500",
    combined: "text-gray-700 bg-gray-50 border-gray-200",
  },
  unknown: {
    text: "text-gray-700",
    background: "bg-gray-50",
    border: "border-gray-200",
    accent: "bg-gray-500",
    combined: "text-gray-700 bg-gray-50 border-gray-200",
  },
} as const;

/**
 * Gradient Themes - Used for metric cards and visual displays
 */
export const GRADIENT_THEMES = {
  green: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100",
  purple: "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100",
  blue: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100",
  red: "bg-gradient-to-br from-red-50 to-rose-50 border-red-100",
  amber: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100",
  slate: "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-100",
} as const;

/**
 * Animation States - Used for loading and live indicators
 */
export const ANIMATION_STATES = {
  loading: "bg-yellow-500 animate-pulse",
  live: "bg-green-500",
  liveAnimated: "bg-green-500 animate-pulse",
  offline: "bg-gray-500",
  error: "bg-red-500",
} as const;

/**
 * Card Variants - Standardized card styling
 */
export const CARD_VARIANTS = {
  default: "border-gray-200 bg-white",
  hover: "hover:border-gray-300 hover:shadow-md transition-all duration-200",
  error: "border-red-200 bg-red-50",
  success: "border-green-200 bg-green-50",
  warning: "border-yellow-200 bg-yellow-50",
} as const;

/**
 * Size Variants - Standardized sizing across components
 */
export const SIZE_VARIANTS = {
  indicator: {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  },
  card: {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  },
} as const;

/**
 * Layout Patterns - Standardized grid and flexbox layouts
 */
export const LAYOUT_PATTERNS = {
  metricCards: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  healthCards: "grid-cols-1 md:grid-cols-3",
  fullWidth: "grid-cols-1",
  twoColumn: "grid-cols-1 md:grid-cols-2",
  threeColumn: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
} as const;

/**
 * Type definitions for theme system
 */
export type StatusThemeType = keyof typeof STATUS_THEMES;
export type GradientThemeType = keyof typeof GRADIENT_THEMES;
export type AnimationStateType = keyof typeof ANIMATION_STATES;
export type CardVariantType = keyof typeof CARD_VARIANTS;
export type SizeVariantType =
  | keyof typeof SIZE_VARIANTS.indicator
  | keyof typeof SIZE_VARIANTS.card;

/**
 * Utility function to combine theme classes with Tailwind's cn function
 * Prevents class conflicts and provides consistent theming
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get a complete status theme by combining all related classes
 *
 * @param status - The status type
 * @param includeAccent - Whether to include accent colors
 * @returns Combined className string
 */
export function getStatusTheme(
  status: StatusThemeType,
  includeAccent = false,
): string {
  const theme = STATUS_THEMES[status];
  const baseClasses = `${theme.text} ${theme.background} ${theme.border}`;

  if (includeAccent) {
    return `${baseClasses} ${theme.accent}`;
  }

  return baseClasses;
}

/**
 * Get size variant classes for a specific component type
 *
 * @param type - The component type (indicator, card)
 * @param size - The size variant
 * @returns Size className string
 */
export function getSizeClasses(
  type: keyof typeof SIZE_VARIANTS,
  size: string,
): string {
  const sizeMap = SIZE_VARIANTS[type];
  return sizeMap[size as keyof typeof sizeMap] || sizeMap.md || "";
}
