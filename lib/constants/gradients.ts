/**
 * Centralized gradient constants eliminating hardcoded gradient patterns
 * Complies with blueprint.md line 419 (DRY principle) and line 423 (constants centralization)
 */

/**
 * Background gradient variations for UI components
 */
export const BACKGROUND_GRADIENTS = {
  // Primary page backgrounds
  PRIMARY_PAGE: "bg-gradient-to-br from-slate-50 to-blue-50",

  // Hero section backgrounds
  HERO_BACKGROUND: "bg-gradient-to-r from-blue-600 to-purple-600",

  // Card backgrounds (from gradient-card.tsx)
  CARD_GREEN: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100",
  CARD_PURPLE:
    "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100",
  CARD_BLUE: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100",
  CARD_RED: "bg-gradient-to-br from-red-50 to-rose-50 border-red-100",
  CARD_AMBER: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100",
  CARD_SLATE: "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-100",
} as const;

/**
 * Text gradient variations for headings and accents
 */
export const TEXT_GRADIENTS = {
  PRIMARY_HERO:
    "bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent",

  // Additional text gradients for future use
  SECONDARY:
    "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent",
  SUCCESS:
    "bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent",
  WARNING:
    "bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent",
  ERROR:
    "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent",
} as const;

/**
 * Button gradient variations
 */
export const BUTTON_GRADIENTS = {
  PRIMARY:
    "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
  SECONDARY:
    "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
  SUCCESS:
    "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
} as const;

/**
 * Semantic gradient aliases for better readability
 */
export const Gradients = {
  // Page layouts
  PAGE_BACKGROUND: BACKGROUND_GRADIENTS.PRIMARY_PAGE,

  // Hero sections
  HERO_TEXT: TEXT_GRADIENTS.PRIMARY_HERO,
  HERO_BACKGROUND: BACKGROUND_GRADIENTS.HERO_BACKGROUND,

  // Interactive elements
  BUTTON_PRIMARY: BUTTON_GRADIENTS.PRIMARY,
  BUTTON_SECONDARY: BUTTON_GRADIENTS.SECONDARY,

  // Cards (for use with gradient cards)
  CARD: BACKGROUND_GRADIENTS,
} as const;

/**
 * Type definitions for gradient values
 */
export type GradientType =
  (typeof BACKGROUND_GRADIENTS)[keyof typeof BACKGROUND_GRADIENTS];
export type TextGradientType =
  (typeof TEXT_GRADIENTS)[keyof typeof TEXT_GRADIENTS];
export type ButtonGradientType =
  (typeof BUTTON_GRADIENTS)[keyof typeof BUTTON_GRADIENTS];
