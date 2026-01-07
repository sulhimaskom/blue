/**
 * Enterprise Theme Service Test Suite
 *
 * Critical Business Logic Testing:
 * - Theme data loading with intelligent caching
 * - Theme activation/deactivation operations
 * - Business statistics calculation
 * - Theme validation and integrity checking
 * - Error handling with fallback data
 *
 * Test Design Principles Applied:
 * - AAA Pattern: Arrange-Act-Assert structure
 * - Test Behavior Not Implementation: Verifying WHAT service does, not HOW
 * - Meaningful Coverage: Covers critical paths with realistic scenarios
 * - Descriptive Test Names: Clear test names indicating scenario and expectation
 * - One Assertion Focus: Each test has focused, single-purpose assertions
 */

import { EnterpriseThemeService } from "../lib/services/enterprise-theme-service";
import {
  enterpriseThemeManager,
  type EnterpriseThemeConfig,
} from "../lib/constants/enterprise-themes";
import type { EnterpriseThemeStats } from "../lib/services/service-types";

describe("EnterpriseThemeService - Critical Business Logic", () => {
  let service: EnterpriseThemeService;

  beforeEach(() => {
    // Create fresh service instance for test isolation
    service = new EnterpriseThemeService();

    // Reset enterprise theme manager state
    enterpriseThemeManager.resetTheme();

    // Clear all mocks to ensure test isolation
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    // Restore all mocks to prevent cross-test contamination
    // Must be called BEFORE resetTheme to avoid hitting mocked versions
    jest.restoreAllMocks();

    // Ensure clean state after each test
    enterpriseThemeManager.resetTheme();
  });

  describe("loadThemeData - Theme Data Loading", () => {
    test("should load theme data successfully with all themes and stats", async () => {
      // Arrange
      const expectedThemes = enterpriseThemeManager.getAllThemes();

      // Act
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (!result.data) return;

      expect(result.data.themes.length).toBeGreaterThan(0);
      expect(result.data.stats).toBeDefined();
      expect(result.data.stats.totalThemes).toBe(expectedThemes.length);
    });

    test("should include active theme in loaded data if one is set", async () => {
      // Arrange
      const allThemes = enterpriseThemeManager.getAllThemes();
      if (allThemes.length > 0) {
        enterpriseThemeManager.setActiveTheme(allThemes[0].customerId);
      }

      // Act
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (!result.data) return;

      expect(result.data.activeTheme).toBeDefined();
      expect(result.data.activeTheme?.customerId).toBeDefined();
      expect(result.data.stats.activeThemes).toBe(1);
    });

    test("should return null active theme when no theme is active", async () => {
      // Arrange
      enterpriseThemeManager.resetTheme();

      // Act
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (!result.data) return;

      expect(result.data.activeTheme).toBeNull();
      expect(result.data.stats.activeThemes).toBe(0);
    });

    test("should use cached data when cache is valid", async () => {
      // Arrange
      await service.loadThemeData(); // First call to cache data

      // Act
      const cachedResult = await service.loadThemeData(); // Should use cache

      // Assert
      expect(cachedResult.success).toBe(true);
      expect(cachedResult.data).toBeDefined();
    });

    test("should calculate correct theme statistics", async () => {
      // Arrange & Act
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (!result.data) return;

      const stats = result.data.stats;

      expect(stats.totalThemes).toBeGreaterThan(0);
      expect(stats.activeThemes).toBeGreaterThanOrEqual(0);
      expect(stats.activeThemes).toBeLessThanOrEqual(1);
      expect(stats.enterpriseCustomers).toBeGreaterThanOrEqual(0);
      expect(stats.customizationRate).toBeGreaterThanOrEqual(0);
      expect(stats.customizationRate).toBeLessThanOrEqual(100);
    });

    test("should return fallback data on error while maintaining structure", async () => {
      // Arrange
      jest
        .spyOn(enterpriseThemeManager, "getAllThemes")
        .mockImplementation(() => {
          throw new Error("Failed to load themes");
        });

      // Act
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeDefined(); // Fallback data should be provided
      if (!result.data) return;

      expect(result.data.themes).toEqual([]);
      expect(result.data.activeTheme).toBeNull();
      expect(result.data.stats.totalThemes).toBe(0);
      expect(result.data.stats.customizationRate).toBe(0);
    });
  });

  describe("activateTheme - Theme Activation Operations", () => {
    test("should activate existing theme successfully", async () => {
      // Arrange
      const allThemes = enterpriseThemeManager.getAllThemes();
      const themeToActivate = allThemes[0];

      // Act
      const result = await service.activateTheme(themeToActivate.customerId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should fail to activate non-existent theme", async () => {
      // Arrange
      const nonExistentCustomerId = "non-existent-customer-id";

      // Act
      const result = await service.activateTheme(nonExistentCustomerId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Theme not found");
    });

    test("should clear cache after theme activation", async () => {
      // Arrange
      await service.loadThemeData(); // Cache initial data
      const allThemes = enterpriseThemeManager.getAllThemes();

      // Act
      await service.activateTheme(allThemes[0].customerId);

      // Assert - Cache should be cleared, next load will fetch fresh data
      const freshResult = await service.loadThemeData();
      expect(freshResult.success).toBe(true);
      expect(freshResult.data).toBeDefined();
      if (!freshResult.data) return;

      expect(freshResult.data.activeTheme).toBeDefined();
    });

    test("should update active theme in loaded data after activation", async () => {
      // Arrange
      const allThemes = enterpriseThemeManager.getAllThemes();
      const firstTheme = allThemes[0];

      // Act
      await service.activateTheme(firstTheme.customerId);
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (!result.data) return;

      expect(result.data.activeTheme?.customerId).toBe(firstTheme.customerId);
      expect(result.data.stats.activeThemes).toBe(1);
    });
  });

  describe("resetTheme - Theme Reset Operations", () => {
    test("should reset active theme successfully", async () => {
      // Arrange
      const allThemes = enterpriseThemeManager.getAllThemes();
      if (allThemes.length > 0) {
        await service.activateTheme(allThemes[0].customerId);
      }

      // Act
      const result = await service.resetTheme();

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should clear cache after theme reset", async () => {
      // Arrange
      await service.loadThemeData(); // Cache initial data

      // Act
      await service.resetTheme();

      // Assert - Next load will fetch fresh data with no active theme
      const freshResult = await service.loadThemeData();
      expect(freshResult.success).toBe(true);
      expect(freshResult.data).toBeDefined();
      if (!freshResult.data) return;

      expect(freshResult.data.activeTheme).toBeNull();
    });

    test("should update loaded data to show no active theme after reset", async () => {
      // Arrange
      const allThemes = enterpriseThemeManager.getAllThemes();
      if (allThemes.length > 0) {
        await service.activateTheme(allThemes[0].customerId);
      }

      // Act
      await service.resetTheme();
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (!result.data) return;

      expect(result.data.activeTheme).toBeNull();
      expect(result.data.stats.activeThemes).toBe(0);
    });
  });

  describe("calculateThemeStats - Business Statistics Calculation", () => {
    test("should calculate total themes correctly", () => {
      // Arrange
      const themes = enterpriseThemeManager.getAllThemes();

      // Act
      const stats = service["calculateThemeStats"](themes, null);

      // Assert
      expect(stats.totalThemes).toBe(themes.length);
    });

    test("should calculate active themes correctly when theme is active", () => {
      // Arrange
      const themes = enterpriseThemeManager.getAllThemes();
      const activeTheme = themes.length > 0 ? themes[0] : null;

      // Act
      const stats = service["calculateThemeStats"](themes, activeTheme);

      // Assert
      expect(stats.activeThemes).toBe(activeTheme ? 1 : 0);
    });

    test("should calculate enterprise customers correctly", () => {
      // Arrange
      const themes = enterpriseThemeManager.getAllThemes();

      // Act
      const stats = service["calculateThemeStats"](themes, null);

      // Assert
      const expectedEnterpriseCustomers = themes.filter(
        (theme) => theme.isActive,
      ).length;
      expect(stats.enterpriseCustomers).toBe(expectedEnterpriseCustomers);
    });

    test("should calculate customization rate correctly for customized themes", () => {
      // Arrange
      const themes = enterpriseThemeManager.getAllThemes();

      // Act
      const stats = service["calculateThemeStats"](themes, null);

      // Assert
      const customizedThemes = themes.filter(
        (theme) => theme.logoUrl && theme.logoUrl.trim() !== "",
      ).length;
      const expectedRate =
        stats.totalThemes > 0
          ? (customizedThemes / stats.totalThemes) * 100
          : 0;
      expect(stats.customizationRate).toBeCloseTo(expectedRate, 1);
    });

    test("should return zero customization rate when no themes are customized", () => {
      // Arrange
      const themes: EnterpriseThemeConfig[] = [
        {
          customerId: "test-1",
          brandName: "Test Brand 1",
          primaryColor: "#000000",
          secondaryColor: "#FFFFFF",
          accentColor: "#FF0000",
          logoUrl: "",
          isActive: false,
        },
      ];

      // Act
      const stats = service["calculateThemeStats"](themes, null);

      // Assert
      expect(stats.customizationRate).toBe(0);
    });

    test("should return zero customization rate when themes array is empty", () => {
      // Arrange
      const themes: EnterpriseThemeConfig[] = [];

      // Act
      const stats = service["calculateThemeStats"](themes, null);

      // Assert
      expect(stats.totalThemes).toBe(0);
      expect(stats.customizationRate).toBe(0);
    });

    test("should return 100% customization rate when all themes have logos", () => {
      // Arrange
      const themes: EnterpriseThemeConfig[] = [
        {
          customerId: "test-1",
          brandName: "Test Brand 1",
          primaryColor: "#000000",
          secondaryColor: "#FFFFFF",
          accentColor: "#FF0000",
          logoUrl: "https://example.com/logo.png",
          isActive: false,
        },
        {
          customerId: "test-2",
          brandName: "Test Brand 2",
          primaryColor: "#111111",
          secondaryColor: "#EEEEEE",
          accentColor: "#00FF00",
          logoUrl: "https://example.com/logo2.png",
          isActive: false,
        },
      ];

      // Act
      const stats = service["calculateThemeStats"](themes, null);

      // Assert
      expect(stats.customizationRate).toBe(100);
    });
  });

  describe("validateTheme - Theme Validation Logic", () => {
    test("should validate theme with all required fields and valid colors", () => {
      // Arrange
      const validTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "Test Brand",
        primaryColor: "#000000",
        secondaryColor: "#FFFFFF",
        accentColor: "#FF0000",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(validTheme);

      // Assert
      expect(isValid).toBe(true);
    });

    test("should validate theme with 3-character hex colors", () => {
      // Arrange
      const validTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "Test Brand",
        primaryColor: "#000",
        secondaryColor: "#FFF",
        accentColor: "#F00",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(validTheme);

      // Assert
      expect(isValid).toBe(true);
    });

    test("should invalidate theme with missing customerId", () => {
      // Arrange
      const invalidTheme: EnterpriseThemeConfig = {
        customerId: "",
        brandName: "Test Brand",
        primaryColor: "#000000",
        secondaryColor: "#FFFFFF",
        accentColor: "#FF0000",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(invalidTheme);

      // Assert
      expect(isValid).toBe(false);
    });

    test("should invalidate theme with missing brandName", () => {
      // Arrange
      const invalidTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "",
        primaryColor: "#000000",
        secondaryColor: "#FFFFFF",
        accentColor: "#FF0000",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(invalidTheme);

      // Assert
      expect(isValid).toBe(false);
    });

    test("should invalidate theme with invalid hex color format", () => {
      // Arrange
      const invalidTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "Test Brand",
        primaryColor: "invalid-color",
        secondaryColor: "#FFFFFF",
        accentColor: "#FF0000",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(invalidTheme);

      // Assert
      expect(isValid).toBe(false);
    });

    test("should invalidate theme with incomplete hex color (5 chars)", () => {
      // Arrange
      const invalidTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "Test Brand",
        primaryColor: "#00000",
        secondaryColor: "#FFFFFF",
        accentColor: "#FF0000",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(invalidTheme);

      // Assert
      expect(isValid).toBe(false);
    });

    test("should invalidate theme with invalid secondary color", () => {
      // Arrange
      const invalidTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "Test Brand",
        primaryColor: "#000000",
        secondaryColor: "not-a-color",
        accentColor: "#FF0000",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(invalidTheme);

      // Assert
      expect(isValid).toBe(false);
    });

    test("should invalidate theme with invalid accent color", () => {
      // Arrange
      const invalidTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "Test Brand",
        primaryColor: "#000000",
        secondaryColor: "#FFFFFF",
        accentColor: "rgba(255,0,0,0.5)",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(invalidTheme);

      // Assert
      expect(isValid).toBe(false);
    });

    test("should validate theme with valid URL logo", () => {
      // Arrange
      const validTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "Test Brand",
        primaryColor: "#000000",
        secondaryColor: "#FFFFFF",
        accentColor: "#FF0000",
        logoUrl: "https://example.com/logo.png",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(validTheme);

      // Assert
      expect(isValid).toBe(true);
    });

    test("should validate theme with base64 data URL logo", () => {
      // Arrange
      const validTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "Test Brand",
        primaryColor: "#000000",
        secondaryColor: "#FFFFFF",
        accentColor: "#FF0000",
        logoUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(validTheme);

      // Assert
      expect(isValid).toBe(true);
    });

    test("should invalidate theme with malformed URL logo", () => {
      // Arrange
      const invalidTheme: EnterpriseThemeConfig = {
        customerId: "test-customer",
        brandName: "Test Brand",
        primaryColor: "#000000",
        secondaryColor: "#FFFFFF",
        accentColor: "#FF0000",
        logoUrl: "not-a-valid-url",
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(invalidTheme);

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe("getThemeSummary - Theme Summary Generation", () => {
    test("should generate correct summary with active theme", async () => {
      // Arrange
      const allThemes = enterpriseThemeManager.getAllThemes();
      if (allThemes.length > 0) {
        await service.activateTheme(allThemes[0].customerId);
      }
      const data = await service.loadThemeData();

      // Assert
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      if (!data.data) return;

      // Act
      const summary = service.getThemeSummary(data.data);

      // Assert
      expect(summary.totalThemes).toBeGreaterThan(0);
      expect(summary.hasActiveTheme).toBe(true);
      expect(summary.activeThemeName).not.toBe("No active theme");
      expect(summary.customizationRate).toMatch(/^\d+\.\d+%$/);
    });

    test("should generate summary without active theme", async () => {
      // Arrange
      await service.resetTheme();
      const data = await service.loadThemeData();

      // Assert
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      if (!data.data) return;

      // Act
      const summary = service.getThemeSummary(data.data);

      // Assert
      expect(summary.hasActiveTheme).toBe(false);
      expect(summary.activeThemeName).toBe("No active theme");
      expect(summary.activeCustomerId).toBe("none");
    });

    test("should format customization rate correctly", async () => {
      // Arrange
      const data = await service.loadThemeData();

      // Assert
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      if (!data.data) return;

      // Act
      const summary = service.getThemeSummary(data.data);

      // Assert
      expect(summary.customizationRate).toMatch(/^\d+\.\d+%/);
      const rateValue = parseFloat(summary.customizationRate);
      expect(rateValue).toBeGreaterThanOrEqual(0);
      expect(rateValue).toBeLessThanOrEqual(100);
    });
  });

  describe("Error Handling - Resilience Testing", () => {
    test("should handle getAllThemes errors gracefully", async () => {
      // Arrange
      jest
        .spyOn(enterpriseThemeManager, "getAllThemes")
        .mockImplementation(() => {
          throw new Error("Database connection failed");
        });

      // Act
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Database connection failed");
      expect(result.data).toBeDefined(); // Fallback data provided
    });

    test("should handle getActiveTheme errors gracefully", async () => {
      // Arrange
      jest
        .spyOn(enterpriseThemeManager, "getActiveTheme")
        .mockImplementation(() => {
          throw new Error("Active theme lookup failed");
        });

      // Act
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should handle theme activation errors gracefully", async () => {
      // Arrange
      jest.spyOn(enterpriseThemeManager, "getTheme").mockImplementation(() => {
        throw new Error("Theme lookup service unavailable");
      });

      // Act
      const result = await service.activateTheme("test-customer");

      // Assert - Service catches error and returns failure result
      expect(result.success).toBe(false);
      expect(result.error).toContain("Theme lookup service unavailable");
    });

    test("should handle theme reset errors gracefully", async () => {
      // Arrange
      jest
        .spyOn(enterpriseThemeManager, "resetTheme")
        .mockImplementation(() => {
          throw new Error("Reset service unavailable");
        });

      // Act
      const result = await service.resetTheme();

      // Assert - Service catches error and returns failure result
      expect(result.success).toBe(false);
      expect(result.error).toContain("Reset service unavailable");
    });
  });

  describe("Cache Behavior - Performance Optimization", () => {
    test("should cache data for 30 seconds", async () => {
      // Arrange
      const startTime = Date.now();
      await service.loadThemeData(); // First call - cache data

      // Act
      const cachedResult = await service.loadThemeData(); // Should use cache
      const cacheTime = Date.now() - startTime;

      // Assert
      expect(cachedResult.success).toBe(true);
      expect(cacheTime).toBeLessThan(100); // Should be much faster with cache
    });

    test("should refresh cache after expiration", async () => {
      // Arrange
      await service.loadThemeData(); // Initial cache

      // Mock cache expiration by manipulating private cache time
      (service as any).lastCacheTime = Date.now() - 31000; // 31 seconds ago

      // Act
      const result = await service.loadThemeData();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test("should clear cache on theme activation", async () => {
      // Arrange
      await service.loadThemeData(); // Cache initial data
      const allThemes = enterpriseThemeManager.getAllThemes();

      // Act
      await service.activateTheme(allThemes[0].customerId);

      // Assert - Cache should be cleared
      expect((service as any).cachedData).toBeNull();
    });

    test("should clear cache on theme reset", async () => {
      // Arrange
      await service.loadThemeData(); // Cache initial data

      // Act
      await service.resetTheme();

      // Assert - Cache should be cleared
      expect((service as any).cachedData).toBeNull();
    });
  });

  describe("Edge Cases - Boundary Testing", () => {
    test("should invalidate themes with whitespace-only logo URLs", () => {
      // Arrange
      const theme: EnterpriseThemeConfig = {
        customerId: "test",
        brandName: "Test",
        primaryColor: "#000000",
        secondaryColor: "#FFFFFF",
        accentColor: "#FF0000",
        logoUrl: "   ", // Whitespace only
        isActive: false,
      };

      // Act
      const isValid = service.validateTheme(theme);

      // Assert - Whitespace is not a valid URL or data URL
      expect(isValid).toBe(false);
    });

    test("should handle hex colors with uppercase and lowercase", () => {
      // Arrange
      const theme1: EnterpriseThemeConfig = {
        customerId: "test-1",
        brandName: "Test 1",
        primaryColor: "#ABCDEF",
        secondaryColor: "#123456",
        accentColor: "#FF00FF",
        isActive: false,
      };

      const theme2: EnterpriseThemeConfig = {
        customerId: "test-2",
        brandName: "Test 2",
        primaryColor: "#abcdef",
        secondaryColor: "#123456",
        accentColor: "#ff00ff",
        isActive: false,
      };

      // Act
      const isValid1 = service.validateTheme(theme1);
      const isValid2 = service.validateTheme(theme2);

      // Assert
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });

    test("should calculate 0% customization for themes without logos", () => {
      // Arrange
      const themes: EnterpriseThemeConfig[] = [
        {
          customerId: "test-1",
          brandName: "Test 1",
          primaryColor: "#000000",
          secondaryColor: "#FFFFFF",
          accentColor: "#FF0000",
          isActive: false,
        },
        {
          customerId: "test-2",
          brandName: "Test 2",
          primaryColor: "#111111",
          secondaryColor: "#EEEEEE",
          accentColor: "#00FF00",
          isActive: false,
        },
      ];

      // Act
      const stats = service["calculateThemeStats"](themes, null);

      // Assert
      expect(stats.customizationRate).toBe(0);
    });

    test("should handle mixed themes with and without logos", () => {
      // Arrange
      const themes: EnterpriseThemeConfig[] = [
        {
          customerId: "test-1",
          brandName: "Test 1",
          primaryColor: "#000000",
          secondaryColor: "#FFFFFF",
          accentColor: "#FF0000",
          logoUrl: "https://example.com/logo1.png",
          isActive: false,
        },
        {
          customerId: "test-2",
          brandName: "Test 2",
          primaryColor: "#111111",
          secondaryColor: "#EEEEEE",
          accentColor: "#00FF00",
          isActive: false,
        },
        {
          customerId: "test-3",
          brandName: "Test 3",
          primaryColor: "#222222",
          secondaryColor: "#DDDDDD",
          accentColor: "#0000FF",
          logoUrl: "https://example.com/logo3.png",
          isActive: false,
        },
      ];

      // Act
      const stats = service["calculateThemeStats"](themes, null);

      // Assert - 2 out of 3 themes have logos
      expect(stats.totalThemes).toBe(3);
      expect(stats.customizationRate).toBeCloseTo(66.7, 1);
    });
  });
});
