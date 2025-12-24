/**
 * Environment adapter utility providing type-safe environment detection
 * Eliminates direct process.env access in UI components (blueprint.md line 424 compliance)
 */

/**
 * Check if running in development environment
 * @returns boolean indicating development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if running in production environment
 * @returns boolean indicating production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in test environment
 * @returns boolean indicating test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Get current environment name safely
 * @returns string of current environment
 */
export function getEnvironmentName(): string {
  return process.env.NODE_ENV || "unknown";
}

/**
 * Environment configuration object for easy access
 */
export const Environment = {
  isDevelopment,
  isProduction,
  isTest,
  getName: getEnvironmentName,
} as const;

/**
 * Type-safe environment feature flags
 */
export const Features = {
  /**
   * Show detailed error information in development
   */
  showDevelopmentErrors: isDevelopment(),

  /**
   * Enable debug logging in development/test
   */
  enableDebugLogging: isDevelopment() || isTest(),

  /**
   * Enable production optimizations
   */
  enableProductionOptimizations: isProduction(),
} as const;
