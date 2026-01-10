/**
 * Enterprise Theme Provider Component
 *
 * Provides enterprise white-label theming support for entire application
 * Handles theme initialization, customer-specific theming, and CSS variable injection
 *
 * @component EnterpriseThemeProvider
 */

/* eslint-disable no-unused-vars */
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  type EnterpriseThemeConfig,
  useEnterpriseTheme,
} from "@/lib/constants/enterprise-themes";
import { enterpriseThemeService } from "@/lib/services/enterprise-theme-service";
import { ValidationError } from "@/lib/api-utils";

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

    const detectAndApplyEnterpriseTheme = async () => {
      // Delegate all theme detection logic to service layer
      await enterpriseThemeService.detectAndApplyTheme();
    };

    detectAndApplyEnterpriseTheme();
  }, [mounted, autoDetectTheme, setTheme]);

  /**
   * Update document metadata for enterprise theming
   */
  useEffect(() => {
    if (!mounted || !activeTheme) return;

    // Delegate all DOM manipulation to service layer
    enterpriseThemeService.updateDocumentMetadata(activeTheme);
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
    throw new ValidationError(
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
