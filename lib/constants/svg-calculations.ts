/**
 * SVG and UI calculation constants eliminating magic numbers
 * Complies with blueprint.md line 423 (constants centralization)
 */

/**
 * SVG circle calculation constants for health score visualization
 */
export const SVG_CIRCLES = {
  // Health score circle calculations
  // Base circumference: 2 * π * radius (36px radius = 226.195px circumference)
  CIRCLE_RADIUS: 36,
  CIRCLE_CIRCUMFERENCE: 226, // Rounded from 226.195 for cleaner values
  HEALTH_SCORE_MULTIPLIER: 2.26, // CIRCUMFERENCE / 100 (to convert percentage to stroke length)

  // Additional circle sizes for future use
  SMALL_CIRCLE_RADIUS: 24,
  SMALL_CIRCLE_CIRCUMFERENCE: 151,
  SMALL_CIRCLE_MULTIPLIER: 1.51,

  LARGE_CIRCLE_RADIUS: 48,
  LARGE_CIRCLE_CIRCUMFERENCE: 302,
  LARGE_CIRCLE_MULTIPLIER: 3.02,
} as const;

/**
 * Animation timing constants
 */
export const ANIMATION_TIMING = {
  // Smooth transitions for health score updates
  HEALTH_SCORE_UPDATE: "500ms",

  // Standard UI transitions
  QUICK_TRANSITION: "200ms",
  MEDIUM_TRANSITION: "300ms",
  SLOW_TRANSITION: "500ms",
} as const;

/**
 * Health score threshold constants
 */
export const HEALTH_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  DEGRADED: 50,
  CRITICAL: 0, // Below 50 is critical
} as const;

/**
 * SVG stroke styling constants
 */
export const SVG_STROKES = {
  DEFAULT_WIDTH: "8",
  THIN_WIDTH: "4",
  THICK_WIDTH: "12",

  // Common stroke positions
  CENTER_POSITION: "40",
} as const;

/**
 * Semantic calculation helpers
 */
export const HealthScoreCalculator = {
  /**
   * Calculate stroke-dasharray for health score circle
   * @param score - Health score (0-100)
   * @returns Formatted stroke-dasharray string
   */
  calculateStrokeDasharray(score: number): string {
    return `${score * SVG_CIRCLES.HEALTH_SCORE_MULTIPLIER} ${SVG_CIRCLES.CIRCLE_CIRCUMFERENCE}`;
  },

  /**
   * Get health status text based on score
   * @param score - Health score (0-100)
   * @returns Status text string
   */
  getHealthStatus(score: number): string {
    if (score >= HEALTH_THRESHOLDS.EXCELLENT) return "Excellent";
    if (score >= HEALTH_THRESHOLDS.GOOD) return "Good";
    if (score >= HEALTH_THRESHOLDS.DEGRADED) return "Degraded";
    return "Critical";
  },

  /**
   * Get color class based on health score
   * @param score - Health score (0-100)
   * @returns Tailwind color class
   */
  getHealthColor(score: number): string {
    if (score >= HEALTH_THRESHOLDS.EXCELLENT) return "text-green-600";
    if (score >= HEALTH_THRESHOLDS.GOOD) return "text-blue-600";
    if (score >= HEALTH_THRESHOLDS.DEGRADED) return "text-amber-600";
    return "text-red-600";
  },
} as const;
