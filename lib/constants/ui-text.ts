/**
 * Centralized UI Text Constants
 *
 * Eliminates hardcoded strings across components for:
 * - Internationalization readiness
 * - Consistent text management
 * - Single source of truth for UI copy
 *
 * Blueprint.md Principle 8.2 Compliance: "NO HARDCODED STRINGS"
 */

export const UI_TEXT = {
  // Task Excellence Dashboard
  dashboard: {
    title: "Task Excellence Dashboard",
    subtitle:
      "Real-time monitoring of world-class engineering standards and task execution excellence",
    status: "Status",
    priority: "Priority",
    impact: "Impact",
  },

  // Monitoring Dashboard
  monitoring: {
    systemHealth: "System Health",
    performanceMetrics: "Performance Metrics",
    serviceStatusDetails: "Service Status Details",
    recentActivity: "Recent Activity Log",

    // Health Metrics
    healthScore: "Health Score",
    systemUptime: "System Uptime",
    servicesMonitored: "Services Monitored",
    apiEndpoints: "API Endpoints",

    // Descriptive Text
    continuousOperation: "Continuous operation",
    activeEndpoints: "Active endpoints",
    lastCheck: "Last check",
    status: "Status",
    responseTime: "Response Time",
    lastChecked: "Last Checked",

    // Metric Labels
    avgResponseTime: "Average Response Time",
    errorRate: "Error Rate",
    requestCount: "Request Count",
    uptime: "Uptime",

    // Activity Log
    activityLog: "Activity Log",
    timestamp: "Timestamp",
    details: "Details",
    loadingActivity: "Loading activity data...",
    noActivityAvailable: "No recent activity available.",

    // Performance Categories
    databasePerformance: "Database Performance",
    cachePerformance: "Cache Performance",
    apiPerformance: "API Performance",
    systemResources: "System Resources",

    // Metric Values
    healthy: "healthy",
    degraded: "degraded",
    unhealthy: "unhealthy",
    unknown: "unknown",
    neutral: "neutral",

    // Action Buttons
    viewDetails: "View Details",
    refreshData: "Refresh Data",
    expandAll: "Expand All",
    collapseAll: "Collapse All",

    // Status Messages
    allSystemsOperational: "All systems operational",
    someSystemIssues: "Some systems experiencing issues",
    criticalSystemIssues: "Critical system issues detected",

    // Performance Insights
    performanceTrends: "Performance Trends",
    optimizationSuggestions: "Optimization Suggestions",
    recommendations: "Recommendations",

    // Loading States
    loadingMetrics: "Loading performance metrics...",
    loadingHealthStatus: "Checking system health...",
    refreshingData: "Refreshing data...",
    loadingSystemData: "Loading system data...",

    // Dashboard Header Text
    dashboardTitle: "System Monitoring Dashboard",
    dashboardDescription: "Real-time system health and performance metrics",
    connectionError: "Connection Error",

    // Auto-refresh Controls
    autoRefreshOn: "Auto-refresh ON",
    autoRefreshOff: "Auto-refresh OFF",
    refreshingNow: "Refreshing...",
    refreshNow: "Refresh Now",

    // Performance Status Labels
    criticalWarnings: "Critical warnings",
    atThreshold: "At threshold",

    // Health Score Labels
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    needsAttention: "Needs Attention",
  },

  // Authentication Pages
  auth: {
    signIn: "Sign In",
    signUp: "Sign Up",
    welcomeBack: "Welcome back",
    createAccount: "Create your account",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
  },

  // Common UI Elements
  common: {
    loading: "Loading...",
    error: "Error",
    success: "Success",
    warning: "Warning",
    info: "Information",
    close: "Close",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    more: "More",
    less: "Less",
    back: "Back",
    next: "Next",
    previous: "Previous",
    tryAgain: "Try Again",
    refreshPage: "Refresh Page",

    // Status States
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  },

  // Error Messages
  errors: {
    networkError: "Network error occurred",
    unauthorized: "Unauthorized access",
    notFound: "Resource not found",
    serverError: "Internal server error",
    validationError: "Validation error",
    timeoutError: "Request timed out",
    connectionError: "Connection failed",
  },

  // Success Messages
  success: {
    saved: "Changes saved successfully",
    deleted: "Item deleted successfully",
    created: "Item created successfully",
    updated: "Item updated successfully",
    completed: "Operation completed successfully",
  },

  // Form Validation
  validation: {
    required: "This field is required",
    emailInvalid: "Please enter a valid email address",
    passwordTooShort: "Password must be at least 8 characters",
    passwordMismatch: "Passwords do not match",
    fieldInvalid: "Please enter a valid value",
  },

  // Homepage Content
  homepage: {
    hero: {
      title: "Architect Platform",
      subtitle:
        "AI-powered platform for generating software blueprints and repositories",
      actions: {
        getStarted: "Get Started",
        viewDemo: "View Demo",
      },
    },
    sections: {
      features: {
        title: "Why Choose Architect Platform?",
        description:
          "From idea to production-ready repository in minutes, not weeks.",
      },
    },
  },
} as const;

/**
 * Type-safe access to UI text values
 * Prevents runtime access to non-existent text keys
 */
export type UI_TEXT_KEY = typeof UI_TEXT;

/**
 * Helper to get nested UI text values safely
 * Supports dot notation for nested object access
 */
export const getUIText = <K extends keyof UI_TEXT_KEY>(
  category: K,
  path?: string,
): string => {
  if (!path) {
    return UI_TEXT[category] as any;
  }

  // Handle dot notation for nested access
  const keys = path.split(".");
  let value: any = UI_TEXT[category];

  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }

  return typeof value === "string" ? value : String(value || "");
};

/**
 * Internationalization helper - future ready
 * Can be extended to support multiple languages
 */
export const t = getUIText;
