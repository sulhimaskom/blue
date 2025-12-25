/**
 * Enterprise White-Label Theme System
 *
 * Enables complete brand customization for enterprise customers
 * Builds on existing ui-themes foundation for white-label deployment
 *
 * Features:
 * - Custom brand colors and logos
 * - Enterprise-specific theming
 * - Multi-tenant theme isolation
 * - Dynamic theme switching
 */

import { COLOR_THEMES, BUTTON_THEMES, cn } from "./ui-themes";

/**
 * Enterprise Customer Theme Configuration
 * Defines brand-specific customization for white-label deployment
 */
export interface EnterpriseThemeConfig {
  /** Customer identifier for theme isolation */
  customerId: string;
  /** Brand name for display */
  brandName: string;
  /** Primary brand color (hex format) */
  primaryColor: string;
  /** Secondary brand color (hex format) */
  secondaryColor: string;
  /** Accent color for CTAs and highlights (hex format) */
  accentColor: string;
  /** Custom logo URL or base64 data */
  logoUrl?: string;
  /** Favicon URL for browser tab */
  faviconUrl?: string;
  /** Custom CSS variables for advanced theming */
  customCSS?: Record<string, string>;
  /** Theme variant overrides */
  themeOverrides?: Partial<ThemeOverrides>;
  /** Is this an active enterprise theme */
  isActive: boolean;
}

/**
 * Theme Override Configuration
 * Allows fine-grained control over theme variations
 */
export interface ThemeOverrides {
  /** Status theme color mappings */
  statusThemes?: Partial<
    Record<
      string,
      {
        text?: string;
        background?: string;
        border?: string;
        accent?: string;
      }
    >
  >;
  /** Button theme customizations */
  buttonThemes?: {
    primary?: string;
    secondary?: string;
    outline?: string;
  };
  /** Background and surface colors */
  backgrounds?: {
    card?: string;
    subtle?: string;
    muted?: string;
    accent?: string;
  };
}

/**
 * Pre-configured Enterprise Theme Templates
 * Ready-to-use themes for common enterprise brand patterns
 */
export const ENTERPRISE_THEME_TEMPLATES: Record<string, EnterpriseThemeConfig> =
  {
    // Financial Services - Professional Blue Theme
    financial: {
      customerId: "financial-template",
      brandName: "FinanceConnect",
      primaryColor: "#1e40af",
      secondaryColor: "#3b82f6",
      accentColor: "#059669",
      isActive: false,
      customCSS: {
        "--enterprise-primary": "#1e40af",
        "--enterprise-secondary": "#3b82f6",
        "--enterprise-accent": "#059669",
      },
    },

    // Healthcare - Trust Green Theme
    healthcare: {
      customerId: "healthcare-template",
      brandName: "HealthPlatform",
      primaryColor: "#059669",
      secondaryColor: "#10b981",
      accentColor: "#0891b2",
      isActive: false,
      customCSS: {
        "--enterprise-primary": "#059669",
        "--enterprise-secondary": "#10b981",
        "--enterprise-accent": "#0891b2",
      },
    },

    // Technology - Modern Purple Theme
    technology: {
      customerId: "tech-template",
      brandName: "TechSuite",
      primaryColor: "#7c3aed",
      secondaryColor: "#8b5cf6",
      accentColor: "#06b6d4",
      isActive: false,
      customCSS: {
        "--enterprise-primary": "#7c3aed",
        "--enterprise-secondary": "#8b5cf6",
        "--enterprise-accent": "#06b6d4",
      },
    },

    // Enterprise Corporate - Sophisticated Gray Theme
    corporate: {
      customerId: "corporate-template",
      brandName: "EnterpriseHub",
      primaryColor: "#374151",
      secondaryColor: "#6b7280",
      accentColor: "#dc2626",
      isActive: false,
      customCSS: {
        "--enterprise-primary": "#374151",
        "--enterprise-secondary": "#6b7280",
        "--enterprise-accent": "#dc2626",
      },
    },
  };

/**
 * Enterprise Theme Manager
 * Handles dynamic theming for multi-tenant white-label deployment
 */
export class EnterpriseThemeManager {
  private static instance: EnterpriseThemeManager;
  private themes: Map<string, EnterpriseThemeConfig> = new Map();
  private activeTheme: EnterpriseThemeConfig | null = null;

  private constructor() {
    // Initialize with default templates
    Object.values(ENTERPRISE_THEME_TEMPLATES).forEach((theme) => {
      this.themes.set(theme.customerId, theme);
    });
  }

  static getInstance(): EnterpriseThemeManager {
    if (!EnterpriseThemeManager.instance) {
      EnterpriseThemeManager.instance = new EnterpriseThemeManager();
    }
    return EnterpriseThemeManager.instance;
  }

  /**
   * Register a new enterprise theme
   */
  registerTheme(theme: EnterpriseThemeConfig): void {
    this.themes.set(theme.customerId, theme);

    // Set as active if marked as active
    if (theme.isActive) {
      this.activeTheme = theme;
    }
  }

  /**
   * Get theme by customer ID
   */
  getTheme(customerId: string): EnterpriseThemeConfig | undefined {
    return this.themes.get(customerId);
  }

  /**
   * Get all registered themes
   */
  getAllThemes(): EnterpriseThemeConfig[] {
    return Array.from(this.themes.values());
  }

  /**
   * Set active theme by customer ID
   */
  setActiveTheme(customerId: string): boolean {
    const theme = this.themes.get(customerId);
    if (theme) {
      this.activeTheme = theme;
      this.applyThemeCSS(theme);
      return true;
    }
    return false;
  }

  /**
   * Get current active theme
   */
  getActiveTheme(): EnterpriseThemeConfig | null {
    return this.activeTheme;
  }

  /**
   * Convert hex to RGB string
   */
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "0, 0, 0";
  }

  /**
   * Apply theme CSS variables to document root
   */
  private applyThemeCSS(themeConfig: EnterpriseThemeConfig): void {
    if (typeof window === "undefined") return; // SSR safety

    const root = document.documentElement;

    // Apply custom CSS variables
    if (themeConfig.customCSS) {
      Object.entries(themeConfig.customCSS).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }

    // Apply brand colors directly
    root.style.setProperty("--enterprise-primary", themeConfig.primaryColor);
    root.style.setProperty(
      "--enterprise-secondary",
      themeConfig.secondaryColor,
    );
    root.style.setProperty("--enterprise-accent", themeConfig.accentColor);
    root.style.setProperty(
      "--enterprise-primary-rgb",
      this.hexToRgb(themeConfig.primaryColor),
    );
    root.style.setProperty(
      "--enterprise-secondary-rgb",
      this.hexToRgb(themeConfig.secondaryColor),
    );
    root.style.setProperty(
      "--enterprise-accent-rgb",
      this.hexToRgb(themeConfig.accentColor),
    );
  }

  /**
   * Generate enterprise-specific theme classes
   */
  // eslint-disable-next-line no-unused-vars
  generateThemeClasses(theme: EnterpriseThemeConfig): EnterpriseThemeClasses {
    return {
      primary: `bg-[var(--enterprise-primary)] hover:bg-[var(--enterprise-primary)]/90 text-white`,
      secondary: `bg-[var(--enterprise-secondary)] hover:bg-[var(--enterprise-secondary)]/90 text-white`,
      accent: `bg-[var(--enterprise-accent)] hover:bg-[var(--enterprise-accent)]/90 text-white`,
      outline: `border border-[var(--enterprise-primary)] bg-transparent hover:bg-[var(--enterprise-primary)]/10 text-[var(--enterprise-primary)]`,
      text: {
        primary: `text-[var(--enterprise-primary)]`,
        secondary: `text-[var(--enterprise-secondary)]`,
        accent: `text-[var(--enterprise-accent)]`,
      },
      background: {
        primary: `bg-[var(--enterprise-primary)]/10`,
        secondary: `bg-[var(--enterprise-secondary)]/10`,
        accent: `bg-[var(--enterprise-accent)]/10`,
      },
    };
  }

  /**
   * Get theme-optimized component classes
   */
  getComponentClasses(
    componentType: "button" | "card" | "status" | "text",
  ): string {
    if (!this.activeTheme) {
      // Return default classes when no enterprise theme is active
      return this.getDefaultClasses(componentType);
    }

    const themeClasses = this.generateThemeClasses(this.activeTheme);

    switch (componentType) {
      case "button":
        return themeClasses.primary;
      case "card":
        return cn(
          "bg-white border border-gray-200 rounded-lg shadow-sm",
          themeClasses.background.secondary,
        );
      case "status":
        return themeClasses.text.primary;
      case "text":
        return themeClasses.text.primary;
      default:
        return "";
    }
  }

  /**
   * Get default non-enterprise classes
   */
  private getDefaultClasses(componentType: string): string {
    switch (componentType) {
      case "button":
        return BUTTON_THEMES.primary;
      case "card":
        return "bg-white border border-gray-200 rounded-lg shadow-sm";
      case "status":
        return COLOR_THEMES.primary.heading;
      case "text":
        return COLOR_THEMES.primary.heading;
      default:
        return "";
    }
  }

  /**
   * Remove theme and reset to defaults
   */
  resetTheme(): void {
    this.activeTheme = null;

    if (typeof window === "undefined") return;

    const root = document.documentElement;

    // Remove all enterprise CSS variables
    const properties = [
      "--enterprise-primary",
      "--enterprise-secondary",
      "--enterprise-accent",
      "--enterprise-primary-rgb",
      "--enterprise-secondary-rgb",
      "--enterprise-accent-rgb",
    ];

    properties.forEach((property) => {
      root.style.removeProperty(property);
    });
  }

  /**
   * Export theme configuration for backup/migration
   */
  exportTheme(customerId: string): string | null {
    const theme = this.themes.get(customerId);
    return theme ? JSON.stringify(theme, null, 2) : null;
  }

  /**
   * Import theme configuration
   */
  importTheme(themeJson: string): boolean {
    try {
      const theme: EnterpriseThemeConfig = JSON.parse(themeJson);

      // Validate required fields
      if (!theme.customerId || !theme.brandName || !theme.primaryColor) {
        return false;
      }

      this.registerTheme(theme);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Enterprise Theme Classes Interface
 * Defines the structure for generated theme classes
 */
export interface EnterpriseThemeClasses {
  primary: string;
  secondary: string;
  accent: string;
  outline: string;
  text: {
    primary: string;
    secondary: string;
    accent: string;
  };
  background: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

/**
 * Hook for React components to access enterprise theming
 */
export function useEnterpriseTheme() {
  const themeManager = EnterpriseThemeManager.getInstance();

  return {
    activeTheme: themeManager.getActiveTheme(),
    setTheme: (customerId: string) => themeManager.setActiveTheme(customerId),
    resetTheme: () => themeManager.resetTheme(),
    getClasses: (componentType: "button" | "card" | "status" | "text") =>
      themeManager.getComponentClasses(componentType),
    getAllThemes: () => themeManager.getAllThemes(),
    registerTheme: (theme: EnterpriseThemeConfig) =>
      themeManager.registerTheme(theme),
  };
}

/**
 * Enterprise Theme Provider Component Props
 */
export interface EnterpriseThemeProviderProps {
  /** Customer ID for theme selection */
  customerId?: string;
  /** Children components */
  children: React.ReactNode;
  /** Custom theme configuration */
  customTheme?: EnterpriseThemeConfig;
}

/**
 * Global theme manager instance for easy access
 */
export const enterpriseThemeManager = EnterpriseThemeManager.getInstance();

/**
 * Utility function to create enterprise theme from brand colors
 */
export function createEnterpriseTheme(params: {
  customerId: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
}): EnterpriseThemeConfig {
  return {
    ...params,
    isActive: false,
    customCSS: {
      "--enterprise-primary": params.primaryColor,
      "--enterprise-secondary": params.secondaryColor,
      "--enterprise-accent": params.accentColor,
    },
  };
}
