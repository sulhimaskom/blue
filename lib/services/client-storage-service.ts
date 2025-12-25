import { logger } from "../logger";

/**
 * ClientStorageService - Centralized client-side storage management
 *
 * Service Layer Implementation:
 * - Extracts localStorage operations from UI components
 * - Provides type-safe storage interfaces
 * - Implements error handling and fallback mechanisms
 * - Maintains separation between UI and storage logic
 *
 * Features:
 * - Theme preference management
 * - Error handling for storage unavailable scenarios
 * - Type safety for storage operations
 * - Structured logging for storage events
 *
 * Usage Pattern:
 * - All localStorage operations should use this service
 * - UI components should not access localStorage directly
 * - Service handles edge cases and provides consistent behavior
 */
export class ClientStorageService {
  private static readonly THEME_KEY = "enterprise-theme";

  /**
   * Get stored theme preference from client storage
   *
   * @returns Stored theme customer ID or null if not found/available
   */
  static getTheme(): string | null {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        logger.debug(
          "Client storage not available (server-side or private mode)",
        );
        return null;
      }

      const storedTheme = localStorage.getItem(this.THEME_KEY);
      if (storedTheme) {
        logger.debug("Retrieved theme from client storage", {
          themeId: storedTheme,
        });
        return storedTheme;
      }

      logger.debug("No theme found in client storage");
      return null;
    } catch (error) {
      logger.error("Failed to retrieve theme from client storage", {
        error: error instanceof Error ? error.message : "Unknown error",
        key: this.THEME_KEY,
      });
      return null;
    }
  }

  /**
   * Store theme preference in client storage
   *
   * @param customerId - The customer ID to store as theme preference
   * @returns True if storage was successful, false otherwise
   */
  static setTheme(customerId: string): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        logger.debug(
          "Client storage not available (server-side or private mode)",
          {
            attemptedTheme: customerId,
          },
        );
        return false;
      }

      localStorage.setItem(this.THEME_KEY, customerId);
      logger.debug("Stored theme in client storage", { themeId: customerId });
      return true;
    } catch (error) {
      logger.error("Failed to store theme in client storage", {
        error: error instanceof Error ? error.message : "Unknown error",
        key: this.THEME_KEY,
        attemptedTheme: customerId,
      });
      return false;
    }
  }

  /**
   * Remove theme preference from client storage
   *
   * @returns True if removal was successful, false otherwise
   */
  static clearTheme(): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        logger.debug(
          "Client storage not available (server-side or private mode)",
        );
        return false;
      }

      const storedTheme = localStorage.getItem(this.THEME_KEY);
      localStorage.removeItem(this.THEME_KEY);

      if (storedTheme) {
        logger.debug("Removed theme from client storage", {
          themeId: storedTheme,
        });
      }

      return true;
    } catch (error) {
      logger.error("Failed to remove theme from client storage", {
        error: error instanceof Error ? error.message : "Unknown error",
        key: this.THEME_KEY,
      });
      return false;
    }
  }

  /**
   * Check if client storage is available
   *
   * @returns True if localStorage is available and functional
   */
  static isStorageAvailable(): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }

      // Test write/read to ensure storage is functional
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      logger.debug("Client storage availability check failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * Get storage statistics for debugging
   *
   * @returns Storage availability and current theme status
   */
  static getStorageStats() {
    return {
      available: this.isStorageAvailable(),
      currentTheme: this.getTheme(),
      storageKey: this.THEME_KEY,
    };
  }
}
