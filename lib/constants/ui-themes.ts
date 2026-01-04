/**
 * Centralized UI Theme System
 *
 * Eliminates hardcoded color values across all components
 * Follows blueprint.md principle: No hardcoded strings
 *
 * Usage: Import themes from this file, never hardcode colors directly
 */

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
 * Color Themes - Used for text, icons, and UI elements
 */
export const COLOR_THEMES = {
  // Primary text colors
  primary: {
    heading: "text-gray-900",
    body: "text-gray-600",
    muted: "text-gray-500",
    subtle: "text-gray-400",
    disabled: "text-gray-300",
  },
  // Trend colors for metrics
  trend: {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-gray-500",
  },
  // Icon colors
  icon: {
    primary: "text-gray-400",
    accent: "text-blue-600",
    success: "text-green-500",
    warning: "text-yellow-500",
    error: "text-red-500",
  },
  // Background colors
  background: {
    card: "bg-white",
    subtle: "bg-gray-50",
    muted: "bg-gray-100",
    accent: "bg-blue-100",
    success: "bg-purple-100",
  },
  // Accent colors for specific metrics
  accent: {
    blue: {
      primary: "text-blue-600",
      subtle: "text-blue-100",
      background: "bg-blue-100",
      text: "text-blue-700",
    },
    purple: {
      primary: "text-purple-600",
      subtle: "text-purple-100",
      background: "bg-purple-100",
      text: "text-purple-700",
    },
  },
} as const;

/**
 * Button Themes - Standardized button styling across all components
 */
export const BUTTON_THEMES = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-white hover:bg-gray-50 text-gray-900 border border-gray-300",
  outline:
    "border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-900",
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
export type ButtonThemeType = keyof typeof BUTTON_THEMES;
export type SizeVariantType =
  | keyof typeof SIZE_VARIANTS.indicator
  | keyof typeof SIZE_VARIANTS.card;
export type ColorThemeType = keyof typeof COLOR_THEMES.primary;
export type TrendType = keyof typeof COLOR_THEMES.trend;
export type IconColorType = keyof typeof COLOR_THEMES.icon;
export type BackgroundType = keyof typeof COLOR_THEMES.background;

/**
 * Re-export cn utility from utils to maintain import compatibility
 * Theme system uses centralized utility function for consistency
 */
export { cn } from "../utils";

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

/**
 * Get trend color classes for metric indicators
 *
 * @param direction - The trend direction
 * @returns Color className string
 */
export function getTrendColor(direction: "up" | "down" | "neutral"): string {
  return COLOR_THEMES.trend[
    direction === "up"
      ? "positive"
      : direction === "down"
        ? "negative"
        : "neutral"
  ];
}

/**
 * Get icon color classes
 *
 * @param type - The icon color type
 * @returns Color className string
 */
export function getIconColor(type: keyof typeof COLOR_THEMES.icon): string {
  return COLOR_THEMES.icon[type];
}

/**
 * Get text color classes
 *
 * @param type - The text color type
 * @returns Color className string
 */
export function getTextColor(type: keyof typeof COLOR_THEMES.primary): string {
  return COLOR_THEMES.primary[type];
}

/**
 * Get background color classes
 *
 * @param type - The background color type
 * @returns Background className string
 */
export function getBackgroundColor(
  type: keyof typeof COLOR_THEMES.background,
): string {
  return COLOR_THEMES.background[type];
}

/**
 * Get accent color classes for metrics
 *
 * @param color - The accent color (blue, purple)
 * @param shade - The shade type
 * @returns Accent color className string
 */
export function getAccentColor(
  color: "blue" | "purple",
  shade: "primary" | "subtle" | "background" | "text",
): string {
  return COLOR_THEMES.accent[color][
    shade as keyof typeof COLOR_THEMES.accent.blue
  ];
}

/**
 * Get button theme classes
 *
 * @param theme - The button theme type
 * @returns Button className string
 */
export function getButtonTheme(theme: ButtonThemeType): string {
  return BUTTON_THEMES[theme];
}
