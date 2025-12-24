/**
 * Enterprise Theme Provider Component
 *
 * Provides enterprise white-label theming support for the entire application
 * Handles theme initialization, customer-specific theming, and CSS variable injection
 *
 * @component EnterpriseThemeProvider
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  useEnterpriseTheme,
  type EnterpriseThemeConfig,
} from "@/lib/constants/enterprise-themes";

interface EnterpriseThemeContextType {
  activeTheme: EnterpriseThemeConfig | null;
  setTheme: (customerId: string) => boolean;
  resetTheme: () => void;
  isEnterpriseMode: boolean;
}

const EnterpriseThemeContext = createContext<EnterpriseThemeContextType | null>(
  null,
);

interface EnterpriseThemeProviderProps {
  children: React.ReactNode;
  /** Enable enterprise theme detection from URL/host */
  autoDetectTheme?: boolean;
}

export function EnterpriseThemeProvider({
  children,
  autoDetectTheme = true,
}: EnterpriseThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const { activeTheme, setTheme, resetTheme } = useEnterpriseTheme();

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Define theme detection function
  useEffect(() => {
    if (!mounted || !autoDetectTheme) return;

    const detectAndApplyEnterpriseTheme = () => {
      if (typeof window === "undefined") return;

      // Priority 1: URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const themeParam = urlParams.get("theme") || urlParams.get("customer");
      if (themeParam) {
        setTheme(themeParam);
        return;
      }

      // Priority 2: Subdomain detection
      const hostname = window.location.hostname;
      const subdomain = hostname.split(".")[0];
      if (
        subdomain &&
        subdomain !== "www" &&
        subdomain !== "localhost" &&
        subdomain !== "app"
      ) {
        setTheme(subdomain);
        return;
      }

      // Priority 3: Local storage
      const storedTheme = localStorage.getItem("enterprise-theme");
      if (storedTheme) {
        setTheme(storedTheme);
        return;
      }
    };

    detectAndApplyEnterpriseTheme();
  }, [mounted, autoDetectTheme, setTheme]);

  /**
   * Update document metadata for enterprise theming
   */
  useEffect(() => {
    if (!mounted || !activeTheme) return;

    // Update page title
    if (activeTheme.brandName && document.title) {
      document.title = `${activeTheme.brandName} - Architect Platform`;
    }

    // Update favicon if provided
    if (activeTheme.faviconUrl) {
      const favicon = document.querySelector(
        'link[rel="icon"]',
      ) as HTMLLinkElement;
      if (favicon) {
        favicon.href = activeTheme.faviconUrl;
      }
    }

    // Store theme preference
    localStorage.setItem("enterprise-theme", activeTheme.customerId);

    // Update meta description for enterprise branding
    const metaDescription = document.querySelector(
      'meta[name="description"]',
    ) as HTMLMetaElement;
    if (metaDescription && activeTheme.brandName) {
      metaDescription.content = `${activeTheme.brandName} - AI-powered platform for generating software blueprints`;
    }
  }, [mounted, activeTheme]);

  const contextValue: EnterpriseThemeContextType = {
    activeTheme,
    setTheme,
    resetTheme,
    isEnterpriseMode: !!activeTheme,
  };

  return (
    <EnterpriseThemeContext.Provider value={contextValue}>
      {children}
    </EnterpriseThemeContext.Provider>
  );
}

/**
 * Hook to access enterprise theme context
 */
export function useEnterpriseThemeContext() {
  const context = useContext(EnterpriseThemeContext);
  if (!context) {
    throw new Error(
      "useEnterpriseThemeContext must be used within an EnterpriseThemeProvider",
    );
  }
  return context;
}

/**
 * Hook for components to get enterprise-themed classes
 */
export function useThemedClasses() {
  const { activeTheme, isEnterpriseMode } = useEnterpriseThemeContext();
  const { getClasses } = useEnterpriseTheme();

  return {
    themedClasses: {
      button: getClasses("button"),
      card: getClasses("card"),
      status: getClasses("status"),
      text: getClasses("text"),
    },
    isEnterpriseMode,
    activeTheme,
    getClasses,
  };
}

/**
 * Higher-order component for theming support
 */
export function withEnterpriseTheme<P extends object>(
  Component: React.ComponentType<P>,
) {
  return function ThemedComponent(props: P) {
    const { themedClasses, isEnterpriseMode, activeTheme } = useThemedClasses();

    return (
      <Component
        {...props}
        themedClasses={themedClasses}
        isEnterpriseMode={isEnterpriseMode}
        activeTheme={activeTheme}
      />
    );
  };
}
