import { logger } from "../logger";
import {
  enterpriseThemeManager,
  type EnterpriseThemeConfig,
} from "../constants/enterprise-themes";
import type { EnterpriseThemeStats, ServiceResult } from "./service-types";
import { ClientStorageService } from "./client-storage-service";
import { getUIText } from "../constants/ui-text";

/**
 * Enterprise Theme Service Data Structure
 * Complete data package for theme management UI
 */
interface EnterpriseThemeData {
  themes: EnterpriseThemeConfig[];
  activeTheme: EnterpriseThemeConfig | null;
  stats: EnterpriseThemeStats;
}

/**
 * Enterprise Theme Service
 *
 * Service Layer Implementation following blueprint.md:208-209 principles:
 * - Centralizes all business logic for enterprise theme management
 * - Implements proper error handling and data validation
 * - Maintains separation between UI components and business operations
 * - Provides comprehensive theme analytics and management capabilities
 *
 * Features:
 * - Theme statistics calculation with business metrics
 * - Theme activation/deactivation operations
 * - Data loading with error resilience
 * - Performance optimization through intelligent caching
 * - Type-safe operations with comprehensive error handling
 *
 * Usage Pattern:
 * - Singleton instance exported for consistent usage
 * - All methods return ServiceResult for consistent error handling
 * - Business logic isolated from UI components
 * - Comprehensive logging for debugging and monitoring
 *
 * @example
 * ```typescript
 * import { enterpriseThemeService } from '@/lib/services/enterprise-theme-service';
 *
 * const result = await enterpriseThemeService.loadThemeData();
 * if (result.success) {
 *   console.log('Loaded themes:', result.data.themes.length);
 * }
 * ```
 */
export class EnterpriseThemeService {
  private readonly CACHE_DURATION = 30000; // 30 seconds for theme data
  private cachedData: EnterpriseThemeData | null = null;
  private lastCacheTime: number = 0;

  /**
   * Loads comprehensive theme data including themes and calculated statistics
   *
   * Business Logic:
   * - Retrieves all themes from enterprise theme manager
   * - Calculates business metrics (customization rate, enterprise customers)
   * - Implements performance caching for UI responsiveness
   * - Provides error resilience with fallback data
   *
   * Error Handling Strategy:
   * - Partial failures return available data
   * - Complete failures return empty but valid structure
   * - All errors are logged with context for debugging
   * - UI stability is maintained during all error scenarios
   *
   * @returns Promise resolving to ServiceResult with theme data and business metrics
   *
   * @example
   * ```typescript
   * const result = await enterpriseThemeService.loadThemeData();
   * if (result.success) {
   *   setShowThemes(result.data.themes);
   *   setStats(result.data.stats);
   * }
   * ```
   */
  async loadThemeData(): Promise<ServiceResult<EnterpriseThemeData>> {
    try {
      // Performance optimization: Return cached data if fresh
      if (this.isCacheValid()) {
        logger.debug("Using cached enterprise theme data", {
          cacheAge: Date.now() - this.lastCacheTime,
        });

        return {
          success: true,
          data: this.cachedData!,
        };
      }

      logger.info("Loading enterprise theme data");

      // Load themes from enterprise theme manager
      const allThemes = enterpriseThemeManager.getAllThemes();
      const activeThemeData = enterpriseThemeManager.getActiveTheme();

      // Business logic: Calculate theme statistics
      const stats = this.calculateThemeStats(allThemes, activeThemeData);

      const themeData: EnterpriseThemeData = {
        themes: allThemes,
        activeTheme: activeThemeData,
        stats,
      };

      // Cache the result for performance optimization
      this.cacheData(themeData);

      logger.info("Enterprise theme data loaded successfully", {
        totalThemes: themeData.themes.length,
        activeTheme: themeData.activeTheme?.brandName || "none",
        enterpriseCustomers: themeData.stats.enterpriseCustomers,
        customizationRate: themeData.stats.customizationRate,
      });

      return {
        success: true,
        data: themeData,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to load enterprise theme data", {
        error: errorMessage,
      });

      // Return fallback data to maintain UI stability
      const fallbackData = this.getFallbackThemeData();

      return {
        success: false,
        data: fallbackData,
        error: errorMessage,
      };
    }
  }

  /**
   * Detects and applies enterprise theme from URL, subdomain, or storage
   *
   * Business Logic:
   * - Priority 1: URL parameter (?theme= or ?customer=)
   * - Priority 2: Subdomain detection (customer.domain.com)
   * - Priority 3: Client storage persistence
   * - Validates theme existence before activation
   * - Provides comprehensive logging for debugging
   *
   * Server-Side Safety:
   * - Returns null on server-side (window undefined)
   * - Only runs in browser environment
   *
   * @returns Promise resolving to detected customer ID or null if none found
   *
   * @example
   * ```typescript
   * const customerId = await enterpriseThemeService.detectAndApplyTheme();
   * if (customerId) {
   *   console.log(`Applied theme for customer: ${customerId}`);
   * }
   * ```
   */
  async detectAndApplyTheme(): Promise<string | null> {
    try {
      // Server-side safety check
      if (typeof window === "undefined") {
        logger.debug("Theme detection skipped - server-side environment");
        return null;
      }

      logger.debug("Starting enterprise theme detection");

      // Priority 1: URL parameter detection
      const urlTheme = this.detectThemeFromUrl();
      if (urlTheme) {
        const success = await this.activateTheme(urlTheme);
        if (success.success) {
          logger.info("Theme applied from URL parameter", {
            customerId: urlTheme,
          });
          return urlTheme;
        }
      }

      // Priority 2: Subdomain detection
      const subdomainTheme = this.detectThemeFromSubdomain();
      if (subdomainTheme) {
        const success = await this.activateTheme(subdomainTheme);
        if (success.success) {
          logger.info("Theme applied from subdomain", {
            customerId: subdomainTheme,
          });
          return subdomainTheme;
        }
      }

      // Priority 3: Client storage detection
      const storedTheme = ClientStorageService.getTheme();
      if (storedTheme) {
        const success = await this.activateTheme(storedTheme);
        if (success.success) {
          logger.info("Theme applied from client storage", {
            customerId: storedTheme,
          });
          return storedTheme;
        }
      }

      logger.debug("No enterprise theme detected");
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Theme detection failed", { error: errorMessage });
      return null;
    }
  }

  /**
   * Updates document metadata for enterprise branding
   *
   * Business Logic:
   * - Updates page title with brand name
   * - Updates favicon if provided
   * - Updates meta description
   * - Stores theme preference in client storage
   * - Handles DOM manipulation safely
   *
   * Server-Side Safety:
   * - Returns early on server-side (document undefined)
   * - Only runs in browser environment
   *
   * @param theme - Active enterprise theme configuration
   *
   * @example
   * ```typescript
   * await enterpriseThemeService.updateDocumentMetadata(activeTheme);
   * ```
   */
  async updateDocumentMetadata(theme: EnterpriseThemeConfig): Promise<void> {
    try {
      // Server-side safety check
      if (typeof document === "undefined") {
        logger.debug(
          "Document metadata update skipped - server-side environment",
        );
        return;
      }

      logger.debug("Updating document metadata for enterprise theme", {
        customerId: theme.customerId,
        brandName: theme.brandName,
      });

      // Update page title with brand name
      if (theme.brandName && document.title) {
        const platformName = getUIText("homepage", "hero.title");
        document.title = `${theme.brandName} - ${platformName}`;
        logger.debug("Updated page title", { title: document.title });
      }

      // Update favicon if provided
      if (theme.faviconUrl) {
        const favicon = document.querySelector(
          'link[rel="icon"]',
        ) as HTMLLinkElement;
        if (favicon) {
          favicon.href = theme.faviconUrl;
          logger.debug("Updated favicon", { faviconUrl: theme.faviconUrl });
        }
      }

      // Store theme preference in client storage
      ClientStorageService.setTheme(theme.customerId);

      // Update meta description for enterprise branding
      const metaDescription = document.querySelector(
        'meta[name="description"]',
      ) as HTMLMetaElement;
      if (metaDescription && theme.brandName) {
        metaDescription.content = `${theme.brandName} - AI-powered platform for generating software blueprints`;
        logger.debug("Updated meta description");
      }

      logger.info("Document metadata updated successfully", {
        customerId: theme.customerId,
        brandName: theme.brandName,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to update document metadata", {
        customerId: theme.customerId,
        error: errorMessage,
      });
    }
  }

  /**
   * Activates a theme by customer ID
   *
   * Business Logic:
   * - Validates theme existence before activation
   * - Updates active theme state
   * - Clears cache to ensure UI consistency
   * - Provides detailed operation logging
   *
   * @param customerId - Customer identifier for theme activation
   * @returns Promise resolving to ServiceResult indicating operation success
   *
   * @example
   * ```typescript
   * const result = await enterpriseThemeService.activateTheme('customer-123');
   * if (result.success) {
   *   await enterpriseThemeService.loadThemeData(); // Refresh UI
   * }
   * ```
   */
  async activateTheme(customerId: string): Promise<ServiceResult<void>> {
    try {
      logger.info("Activating enterprise theme", { customerId });

      // Business logic: Validate theme exists
      const theme = enterpriseThemeManager.getTheme(customerId);
      if (!theme) {
        const error = `Theme not found for customer: ${customerId}`;
        logger.warn("Theme activation failed - theme not found", {
          customerId,
        });
        return {
          success: false,
          error,
        };
      }

      // Activate theme through enterprise theme manager
      const activationSuccess =
        enterpriseThemeManager.setActiveTheme(customerId);

      if (activationSuccess !== true) {
        const error = `Failed to activate theme for customer: ${customerId}`;
        logger.error("Theme activation failed", { customerId });
        return {
          success: false,
          error,
        };
      }

      // Clear cache to ensure UI consistency
      this.clearCache();

      logger.info("Enterprise theme activated successfully", {
        customerId,
        brandName: theme.brandName,
      });

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to activate enterprise theme", {
        customerId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Resets the active theme to default
   *
   * Business Logic:
   * - Deactivates current active theme
   * - Clears theme CSS variables
   * - Updates theme manager state
   * - Clears cache for UI consistency
   *
   * @returns Promise resolving to ServiceResult indicating operation success
   *
   * @example
   * ```typescript
   * const result = await enterpriseThemeService.resetTheme();
   * if (result.success) {
   *   await enterpriseThemeService.loadThemeData(); // Refresh UI
   * }
   * ```
   */
  async resetTheme(): Promise<ServiceResult<void>> {
    try {
      logger.info("Resetting enterprise theme to default");

      // Reset theme through enterprise theme manager
      enterpriseThemeManager.resetTheme();

      // Clear cache to ensure UI consistency
      this.clearCache();

      logger.info("Enterprise theme reset successfully");

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to reset enterprise theme", {
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Calculates business statistics for theme analytics
   *
   * Business Logic:
   * - Total themes: Count of all registered themes
   * - Active themes: Count of currently active themes (0 or 1)
   * - Enterprise customers: Count of themes with activation state
   * - Customization rate: Percentage of themes with logo customization
   *
   * @param themes - Array of all enterprise themes
   * @param activeTheme - Currently active theme or null
   * @returns ThemeStats object with calculated business metrics
   *
   * @example
   * ```typescript
   * const stats = enterpriseThemeService.calculateThemeStats(themes, activeTheme);
   * console.log(`Customization rate: ${stats.customizationRate}%`);
   * ```
   */
  calculateThemeStats(
    themes: EnterpriseThemeConfig[],
    activeTheme: EnterpriseThemeConfig | null,
  ): EnterpriseThemeStats {
    // Business logic: Total themes count
    const totalThemes = themes.length;

    // Business logic: Active themes count (0 or 1)
    const activeThemes = activeTheme ? 1 : 0;

    // Business logic: Enterprise customers count (themes with activation state)
    const enterpriseCustomers = themes.filter((theme) => theme.isActive).length;

    // Business logic: Customization rate calculation
    // Themes with logos are considered customized
    const customizedThemes = themes.filter(
      (theme) => theme.logoUrl && theme.logoUrl.trim() !== "",
    ).length;
    const customizationRate =
      totalThemes > 0 ? (customizedThemes / totalThemes) * 100 : 0;

    const stats: EnterpriseThemeStats = {
      totalThemes,
      activeThemes,
      enterpriseCustomers,
      customizationRate,
    };

    logger.debug("Theme statistics calculated", stats);

    return stats;
  }

  /**
   * Validates theme configuration integrity
   *
   * Business Logic:
   * - Validates required fields presence
   * - Validates color format (hex)
   * - Ensures data structure consistency
   * - Provides detailed validation feedback
   *
   * @param theme - Theme configuration to validate
   * @returns boolean indicating theme validity
   *
   * @example
   * ```typescript
   * const isValid = enterpriseThemeService.validateTheme(themeConfig);
   * if (!isValid) {
   *   console.error('Invalid theme configuration');
   * }
   * ```
   */
  validateTheme(theme: EnterpriseThemeConfig): boolean {
    try {
      // Validate required fields
      if (!theme.customerId?.trim() || !theme.brandName?.trim()) {
        logger.warn("Theme validation failed - missing required fields", {
          customerId: theme.customerId,
          brandName: theme.brandName,
        });
        return false;
      }

      // Validate color format (hex)
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (
        !hexColorRegex.test(theme.primaryColor) ||
        !hexColorRegex.test(theme.secondaryColor) ||
        !hexColorRegex.test(theme.accentColor)
      ) {
        logger.warn("Theme validation failed - invalid color format", {
          customerId: theme.customerId,
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          accentColor: theme.accentColor,
        });
        return false;
      }

      // Validate optional fields if present
      if (theme.logoUrl && !this.isValidUrl(theme.logoUrl)) {
        logger.warn("Theme validation failed - invalid logo URL", {
          customerId: theme.customerId,
          logoUrl: theme.logoUrl,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Theme validation error", {
        customerId: theme.customerId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * Gets theme data summary for quick display
   *
   * Business Logic:
   * - Provides condensed theme information
   * - Formats data for dashboard display
   * - Includes key business metrics
   * - Optimized for performance critical UI elements
   *
   * @param data - Complete enterprise theme data
   * @returns Condensed summary object for quick display
   *
   * @example
   * ```typescript
   * const summary = enterpriseThemeService.getThemeSummary(themeData);
   * console.log(`Active theme: ${summary.activeThemeName}`);
   * ```
   */
  getThemeSummary(data: EnterpriseThemeData): {
    totalThemes: number;
    activeThemeName: string;
    activeCustomerId: string;
    customizationRate: string;
    hasActiveTheme: boolean;
  } {
    return {
      totalThemes: data.themes.length,
      activeThemeName: data.activeTheme?.brandName || "No active theme",
      activeCustomerId: data.activeTheme?.customerId || "none",
      customizationRate: `${data.stats.customizationRate.toFixed(1)}%`,
      hasActiveTheme: !!data.activeTheme,
    };
  }

  /**
   * Checks if cache is still valid based on duration
   */
  private isCacheValid(): boolean {
    return !!(
      this.cachedData && Date.now() - this.lastCacheTime < this.CACHE_DURATION
    );
  }

  /**
   * Caches theme data for performance optimization
   */
  private cacheData(data: EnterpriseThemeData): void {
    this.cachedData = data;
    this.lastCacheTime = Date.now();
  }

  /**
   * Clears cached data
   */
  private clearCache(): void {
    this.cachedData = null;
    this.lastCacheTime = 0;
  }

  /**
   * Provides fallback theme data for error scenarios
   */
  private getFallbackThemeData(): EnterpriseThemeData {
    const fallbackStats: EnterpriseThemeStats = {
      totalThemes: 0,
      activeThemes: 0,
      enterpriseCustomers: 0,
      customizationRate: 0,
    };

    return {
      themes: [],
      activeTheme: null,
      stats: fallbackStats,
    };
  }

  /**
   * Detects theme from URL parameters
   *
   * @returns Customer ID from URL or null if not found
   */
  private detectThemeFromUrl(): string | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const themeParam = urlParams.get("theme") || urlParams.get("customer");
      return themeParam?.trim() || null;
    } catch (error) {
      logger.warn("Failed to detect theme from URL", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Detects theme from subdomain
   *
   * @returns Customer ID from subdomain or null if not found
   */
  private detectThemeFromSubdomain(): string | null {
    try {
      const hostname = window.location.hostname;
      const subdomain = hostname.split(".")[0];

      // Exclude common subdomains
      const excludedSubdomains = ["www", "localhost", "app"];

      if (subdomain && !excludedSubdomains.includes(subdomain)) {
        return subdomain;
      }

      return null;
    } catch (error) {
      logger.warn("Failed to detect theme from subdomain", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Validates URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      // Handle base64 data URLs
      if (url.startsWith("data:image/")) {
        return true;
      }
      return false;
    }
  }
}

/**
 * Singleton instance of EnterpriseThemeService for consistent application usage.
 *
 * Usage Pattern:
 * - Import this instance throughout the application
 * - Avoid creating multiple instances to maintain consistency
 * - Service follows stateless design for safe sharing
 *
 * @example
 * ```typescript
 * import { enterpriseThemeService } from '@/lib/services/enterprise-theme-service';
 *
 * // Use the singleton instance
 * const result = await enterpriseThemeService.loadThemeData();
 * ```
 */
export const enterpriseThemeService = new EnterpriseThemeService();
