import type { AIPatternType } from "./ai-pattern-types";

/**
 * Pattern Detection Service
 * Core pattern matching and keyword detection for AI inputs
 */
export class PatternDetectionService {
  /**
   * Predefined industry patterns with keywords and weights
   */
  private static readonly PATTERNS: Record<
    AIPatternType,
    {
      keywords: string[];
      weight: number;
      typicalTTL: number;
    }
  > = {
    marketplace: {
      keywords: [
        "marketplace",
        "seller",
        "buyer",
        "listing",
        "vendor",
        "commission",
        "multi-vendor",
        "product catalog",
        "storefront",
        "market platform",
      ],
      weight: 0.9,
      typicalTTL: 7200,
    },
    ecommerce: {
      keywords: [
        "ecommerce",
        "shopping cart",
        "checkout",
        "payment",
        "product",
        "inventory",
        "order",
        "shipping",
        "store",
        "retail",
      ],
      weight: 0.85,
      typicalTTL: 3600,
    },
    social: {
      keywords: [
        "social",
        "community",
        "feed",
        "posts",
        "followers",
        "profile",
        "messaging",
        "comments",
        "likes",
        "share",
        "network",
      ],
      weight: 0.8,
      typicalTTL: 5400,
    },
    dashboard: {
      keywords: [
        "dashboard",
        "analytics",
        "monitoring",
        "metrics",
        "reports",
        "admin panel",
        "control panel",
        "data visualization",
        "KPI",
      ],
      weight: 0.75,
      typicalTTL: 1800,
    },
    "api-service": {
      keywords: [
        "API",
        "service",
        "backend",
        "microservice",
        "REST",
        "GraphQL",
        "web service",
        "B2B",
        "integration",
        "endpoint",
      ],
      weight: 0.7,
      typicalTTL: 2700,
    },
    "mobile-app": {
      keywords: [
        "mobile",
        "iOS",
        "Android",
        "app",
        "react native",
        "flutter",
        "smartphone",
        "tablet",
        "mobile first",
        "PWA",
      ],
      weight: 0.65,
      typicalTTL: 3600,
    },
    fintech: {
      keywords: [
        "fintech",
        "banking",
        "payments",
        "financial",
        "trading",
        "investment",
        "cryptocurrency",
        "bitcoin",
        "blockchain",
        "wallet",
        "lending",
        "insurance",
        "mortgage",
        "credit scoring",
        "wealth management",
        "robo-advisor",
        "neobank",
      ],
      weight: 0.95,
      typicalTTL: 10800,
    },
    healthcare: {
      keywords: [
        "healthcare",
        "medical",
        "hospital",
        "clinic",
        "patient",
        "doctor",
        "telemedicine",
        "health records",
        "HIPAA",
        "medical device",
        "pharma",
        "biotech",
        "wellness",
        "fitness tracking",
        "diagnostics",
        "electronic health records",
      ],
      weight: 0.9,
      typicalTTL: 7200,
    },
    edtech: {
      keywords: [
        "edtech",
        "education",
        "learning",
        "learning management system",
        "LMS",
        "online course",
        "training",
        "tutoring",
        "e-learning",
        "virtual classroom",
        "student",
        "instructor",
        "curriculum",
        "assessment",
        "certification",
        "MOOC",
      ],
      weight: 0.85,
      typicalTTL: 5400,
    },
    realestate: {
      keywords: [
        "real estate",
        "property",
        "housing",
        "rental",
        "listing",
        "agent",
        "broker",
        "MLS",
        "property management",
        "home buying",
        "home selling",
        "rentals",
        "apartments",
        "condos",
        "commercial real estate",
      ],
      weight: 0.8,
      typicalTTL: 7200,
    },
    logistics: {
      keywords: [
        "logistics",
        "shipping",
        "delivery",
        "supply chain",
        "tracking",
        "warehouse",
        "freight",
        "distribution",
        "fleet management",
        "route optimization",
        "carrier",
        "last mile",
        "fulfillment",
        "inventory",
        "cargo",
      ],
      weight: 0.85,
      typicalTTL: 5400,
    },
    saas: {
      keywords: [
        "SaaS",
        "software as a service",
        "subscription",
        "B2B SaaS",
        "platform",
        "software platform",
        "cloud software",
        "web application",
        "subscription service",
        "recurring",
        "churn",
        "MRR",
        "ARR",
        "customer success",
        "onboarding",
      ],
      weight: 0.7,
      typicalTTL: 2700,
    },
  };

  /**
   * Detect primary pattern type from input text
   */
  static detectPattern(input: string): {
    pattern: AIPatternType | null;
    confidence: number;
    detectedKeywords: string[];
  } {
    const normalizedInput = input.toLowerCase();
    let bestMatch: {
      pattern: AIPatternType;
      confidence: number;
      matchedKeywords: string[];
    } | null = null;

    const industryContext = PatternDetectionService.detectIndustryContext(input);

    for (const [patternType, config] of Object.entries(
      PatternDetectionService.PATTERNS,
    )) {
      const matchedKeywords = config.keywords.filter((keyword) =>
        normalizedInput.includes(keyword.toLowerCase()),
      );

      if (matchedKeywords.length > 0) {
        let confidence =
          (matchedKeywords.length / config.keywords.length) * config.weight;

        if (
          industryContext &&
          PatternDetectionService.isIndustryCompatible(
            patternType as AIPatternType,
            industryContext,
          )
        ) {
          confidence *= 1.2;
        }

        const semanticBonus = PatternDetectionService.calculateSemanticBonus(
          normalizedInput,
          patternType as AIPatternType,
        );
        confidence += semanticBonus;

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            pattern: patternType as AIPatternType,
            confidence: Math.min(confidence, 1.0),
            matchedKeywords,
          };
        }
      }
    }

    return bestMatch
      ? {
          pattern: bestMatch.pattern,
          confidence: bestMatch.confidence,
          detectedKeywords: bestMatch.matchedKeywords,
        }
      : {
          pattern: null,
          confidence: 0,
          detectedKeywords: [],
        };
  }

  /**
   * Detect industry-specific context from input
   */
  static detectIndustryContext(input: string): string | null {
    const industryKeywords: Record<string, string[]> = {
      "finance-banking": [
        "bank",
        "financial",
        "payment",
        "investment",
        "trading",
      ],
      "medical-health": [
        "patient",
        "doctor",
        "medical",
        "health",
        "hospital",
      ],
      education: [
        "student",
        "teacher",
        "course",
        "learning",
        "education",
      ],
      "property-real": [
        "property",
        "real estate",
        "housing",
        "rental",
        "mortgage",
      ],
      transport: [
        "shipping",
        "delivery",
        "logistics",
        "transport",
        "fleet",
      ],
      enterprise: [
        "business",
        "enterprise",
        "company",
        "corporate",
        "organization",
      ],
    };

    const normalizedInput = input.toLowerCase();

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      const matches = keywords.filter((keyword) =>
        normalizedInput.includes(keyword),
      );
      if (matches.length >= 2) {
        return industry;
      }
    }

    return null;
  }

  /**
   * Check if detected pattern is compatible with industry context
   */
  private static isIndustryCompatible(
    pattern: AIPatternType,
    industryContext: string,
  ): boolean {
    const compatibility: Record<string, AIPatternType[]> = {
      "finance-banking": ["fintech", "saas", "dashboard"],
      "medical-health": ["healthcare", "dashboard", "mobile-app"],
      education: ["edtech", "dashboard", "mobile-app"],
      "property-real": ["realestate", "dashboard", "mobile-app"],
      transport: ["logistics", "dashboard", "mobile-app"],
      enterprise: ["saas", "dashboard", "api-service"],
    };

    return compatibility[industryContext]?.includes(pattern) ?? false;
  }

  /**
   * Calculate semantic bonus for pattern confidence
   */
  private static calculateSemanticBonus(
    input: string,
    pattern: AIPatternType,
  ): number {
    const semanticIndicators: Record<string, Record<string, number>> = {
      fintech: {
        secure: 0.1,
        compliance: 0.15,
        regulation: 0.15,
        audit: 0.1,
        regulatory: 0.15,
        financial: 0.05,
      },
      healthcare: {
        hipaa: 0.2,
        compliance: 0.15,
        "patient data": 0.15,
        secure: 0.1,
        medical: 0.05,
        clinical: 0.1,
      },
      saas: {
        enterprise: 0.15,
        business: 0.1,
        corporate: 0.1,
        b2b: 0.15,
        multi: 0.1,
      },
      edtech: {
        online: 0.1,
        learning: 0.15,
        course: 0.1,
        training: 0.1,
        student: 0.05,
      },
    };

    const patternIndicators = semanticIndicators[pattern];
    if (!patternIndicators) {
      return 0;
    }

    let bonus = 0;
    for (const [keyword, weight] of Object.entries(patternIndicators)) {
      if (input.includes(keyword)) {
        bonus += weight;
      }
    }

    return bonus;
  }
}
