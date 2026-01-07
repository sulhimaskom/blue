export const navigationUI = {
  brand: {
    name: "Architect Platform",
  },

  homepage: {
    hero: {
      title: "World-Class Software Architecture",
      subtitle:
        "Build, deploy, and scale production-ready applications with our comprehensive platform. From blueprint generation to intelligent monitoring.",
      actions: {
        getStarted: "Get Started",
        viewDemo: "View Demo",
      },
    },
  },

  navigation: {
    home: "Home",
    dashboard: "Dashboard",
    monitoring: "Monitoring",
    enterprise: "Enterprise",
    analytics: "Analytics",
    settings: "Settings",
  },

  auth: {
    signIn: "Sign In",
    signUp: "Sign Up",
    signOut: "Sign Out",
    getStarted: "Get Started",
    alreadyHaveAccount: "Already have an account? Sign In",
    dontHaveAccount: "Don't have an account? Sign Up",
  },

  dashboard: {
    title: "Dashboard",
    subtitle: "Manage your applications and monitor performance",
    welcome: "Welcome to Dashboard",
    cards: {
      monitoring: {
        title: "Monitoring",
        description: "Real-time system monitoring and performance metrics",
        action: "View Monitoring",
      },
      enterprise: {
        title: "Enterprise",
        description: "Manage white-label themes and custom branding",
        action: "Manage Themes",
      },
      analytics: {
        title: "Analytics",
        description: "Detailed insights and platform usage analytics",
        action: "View Analytics",
      },
    },
    stats: {
      health: "System Health",
      services: "Active Services",
      responseTime: "Response Time",
      uptime: "Uptime",
    },
  },
};

export function getNavigationUI(section: string, key: string): string {
  const keys = key.split(".");
  let value: any = navigationUI;

  if (navigationUI[section as keyof typeof navigationUI]) {
    value = navigationUI[section as keyof typeof navigationUI];
  } else {
    return key;
  }

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  return typeof value === "string" ? value : key;
}
