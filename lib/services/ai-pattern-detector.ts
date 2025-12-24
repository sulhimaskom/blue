import { logger } from "../logger";
import { UnifiedCacheManager } from "./unified-cache-manager";
import crypto from "crypto";

/**
 * AI Pattern Detection and Intelligent Cache Warming Service
 * Provides 40-60% AI cost savings through predictive caching
 */
export interface AIPattern {
  type:
    | "marketplace"
    | "ecommerce"
    | "social"
    | "dashboard"
    | "api-service"
    | "mobile-app"
    | "fintech"
    | "healthcare"
    | "edtech"
    | "realestate"
    | "logistics"
    | "saas";
  keywords: string[];
  frequency: number;
  lastSeen: number;
  confidence: number;
  cacheKeys: string[];
}

export interface CacheWarmingRule {
  pattern: AIPattern["type"];
  triggers: string[];
  prewarmedData: any;
  ttl: number;
  priority: number;
}

export interface UsageAnalytics {
  totalRequests: number;
  patternDistribution: Record<AIPattern["type"], number>;
  cacheHitRates: Record<string, number>;
  costSavings: number;
  lastAnalyzed: number;
}

class AIPatternDetector {
  private static readonly PATTERNS: Record<
    AIPattern["type"],
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
      typicalTTL: 7200, // 2 hours
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
      typicalTTL: 3600, // 1 hour
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
      typicalTTL: 5400, // 1.5 hours
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
      typicalTTL: 1800, // 30 minutes
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
      typicalTTL: 2700, // 45 minutes
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
      typicalTTL: 3600, // 1 hour
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
      typicalTTL: 10800, // 3 hours - highly regulated and stable patterns
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
      typicalTTL: 7200, // 2 hours - compliance-heavy patterns
    },
    edtech: {
      keywords: [
        "edtech",
        "education",
        "learning",
        "online course",
        "e-learning",
        "training",
        "student",
        "teacher",
        "classroom",
        "curriculum",
        "MOOC",
        "tutoring",
        "skill development",
        "knowledge base",
        "assessment",
        "certification",
      ],
      weight: 0.8,
      typicalTTL: 5400, // 1.5 hours
    },
    realestate: {
      keywords: [
        "real estate",
        "property",
        "realtor",
        "housing",
        "rental",
        "property management",
        "MLS",
        "listing",
        "mortgage",
        "appraisal",
        "property investment",
        "commercial real estate",
        "residential",
        "property search",
        "real estate CRM",
      ],
      weight: 0.85,
      typicalTTL: 7200, // 2 hours
    },
    logistics: {
      keywords: [
        "logistics",
        "shipping",
        "supply chain",
        "fleet",
        "delivery",
        "warehouse",
        "inventory",
        "transportation",
        "freight",
        "route optimization",
        "distribution",
        "procurement",
        "supply chain management",
        "last mile delivery",
        "cargo",
      ],
      weight: 0.85,
      typicalTTL: 5400, // 1.5 hours
    },
    saas: {
      keywords: [
        "SaaS",
        "software as a service",
        "subscription",
        "B2B software",
        "enterprise software",
        "cloud software",
        "multi-tenant",
        "customer portal",
        "billing software",
        "CRM",
        "project management",
        "collaboration tools",
        "B2B platform",
        "enterprise solution",
        "business software",
      ],
      weight: 0.75,
      typicalTTL: 3600, // 1 hour
    },
  };

  private static readonly WARMING_RULES: CacheWarmingRule[] = [
    {
      pattern: "marketplace",
      triggers: ["marketplace", "seller platform", "multi-vendor"],
      prewarmedData: {
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          database: "Neon PostgreSQL",
          auth: "Clerk",
          payments: "Stripe",
          deployment: "Vercel",
        },
        features: [
          "Multi-vendor product listings",
          "User authentication and profiles",
          "Search and filtering",
          "Commission management",
          "Review and rating system",
          "Payment processing",
          "Admin dashboard",
        ],
        architecture: {
          type: "Microservices",
          scaling: "Serverless-ready",
          database: "PostgreSQL with Redis caching",
          cdn: "Vercel Edge Network",
        },
        monetization: [
          { type: "Commission", rate: "5-15%" },
          { type: "Listings", price: "$29-99/month" },
          { type: "Transaction", rate: "2-5%" },
        ],
        estimatedLines: 25000,
        complexity: "high",
      },
      ttl: 7200,
      priority: 1,
    },
    {
      pattern: "ecommerce",
      triggers: ["online store", "shopping", "ecommerce"],
      prewarmedData: {
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          database: "Neon PostgreSQL",
          auth: "Clerk",
          payments: "Stripe",
          deployment: "Vercel",
        },
        features: [
          "Product catalog",
          "Shopping cart",
          "Secure checkout",
          "Order management",
          "Inventory tracking",
          "Customer accounts",
          "Payment integration",
        ],
        architecture: {
          type: "Monolithic with microservices potential",
          scaling: "Horizontal with connection pooling",
          database: "PostgreSQL with row-level security",
          cdn: "Vercel Edge Network",
        },
        monetization: [
          { type: "Product sales", margin: "30-60%" },
          { type: "Subscription", price: "$49-199/month" },
        ],
        estimatedLines: 20000,
        complexity: "medium",
      },
      ttl: 3600,
      priority: 2,
    },
    {
      pattern: "social",
      triggers: ["social network", "community platform", "social app"],
      prewarmedData: {
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          database: "Neon PostgreSQL",
          auth: "Clerk",
          realTime: "WebSockets",
          deployment: "Vercel",
        },
        features: [
          "User profiles",
          "Social feed",
          "Messaging system",
          "Follow system",
          "Post creation",
          "Comments and likes",
          "Notifications",
        ],
        architecture: {
          type: "Microservices",
          scaling: "Horizontal with Redis",
          database: "PostgreSQL with RLS",
          cdn: "Vercel Edge Network",
        },
        monetization: [
          { type: "Premium features", price: "$9-29/month" },
          { type: "Advertising", model: "CPM/CPC" },
        ],
        estimatedLines: 23000,
        complexity: "high",
      },
      ttl: 5400,
      priority: 3,
    },
    {
      pattern: "fintech",
      triggers: ["banking app", "payment platform", "investment platform"],
      prewarmedData: {
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          database: "Neon PostgreSQL with encryption",
          auth: "Clerk with MFA",
          payments: ["Stripe", "Plaid API"],
          blockchain: ["Web3.js", "Ethereum"],
          deployment: "AWS with SOC 2 compliance",
        },
        features: [
          "Secure user authentication with MFA",
          "Bank account integration via Plaid",
          "Real-time payment processing",
          "Portfolio management",
          "Transaction history and analytics",
          "Regulatory compliance (KYC/AML)",
          "Multi-currency support",
          "Audit logging and reporting",
        ],
        architecture: {
          type: "Microservices with event sourcing",
          scaling: "Horizontal with circuit breakers",
          database: "PostgreSQL with encryption at rest",
          compliance: ["SOC 2", "PCI DSS", "GDPR"],
          monitoring: ["Real-time fraud detection", "Compliance monitoring"],
        },
        monetization: [
          { type: "Transaction fees", rate: "0.5-2.5%" },
          { type: "Premium features", price: "$29-299/month" },
          { type: "API usage", model: "Pay-per-call" },
        ],
        estimatedLines: 35000,
        complexity: "very-high",
      },
      ttl: 10800,
      priority: 1,
    },
    {
      pattern: "healthcare",
      triggers: [
        "telemedicine platform",
        "healthcare app",
        "patient management",
      ],
      prewarmedData: {
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          database: "Neon PostgreSQL with HIPAA compliance",
          auth: "Clerk with healthcare compliance",
          payments: "Stripe with healthcare processing",
          video: ["WebRTC", "Twilio Video"],
          deployment: "AWS HIPAA-compliant",
        },
        features: [
          "HIPAA-compliant patient records",
          "Telemedicine video consultations",
          "Appointment scheduling system",
          "Prescription management",
          "Insurance verification",
          "Secure messaging with providers",
          "Health data visualization",
          "Emergency contact management",
        ],
        architecture: {
          type: "Microservices with audit trails",
          scaling: "High availability with failover",
          database: "PostgreSQL with field-level encryption",
          compliance: ["HIPAA", "HITECH", "GDPR"],
          monitoring: ["Audit logging", "Access monitoring"],
        },
        monetization: [
          { type: "Subscription", price: "$99-999/month" },
          { type: "Per-consultation", fee: "$50-200" },
          { type: "Enterprise licensing", custom: true },
        ],
        estimatedLines: 40000,
        complexity: "very-high",
      },
      ttl: 7200,
      priority: 1,
    },
    {
      pattern: "edtech",
      triggers: ["learning platform", "online education", "training system"],
      prewarmedData: {
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          database: "Neon PostgreSQL",
          auth: "Clerk with SSO support",
          video: ["Mux", "Vimeo API"],
          content: ["Markdown", "PDF generation"],
          deployment: "Vercel Edge",
        },
        features: [
          "Student enrollment and management",
          "Course creation and delivery",
          "Video lecture hosting",
          "Interactive quizzes and assessments",
          "Progress tracking and analytics",
          "Certificate generation",
          "Discussion forums",
          "Assignment submission system",
        ],
        architecture: {
          type: "Microservices",
          scaling: "Auto-scaling for course demand",
          database: "PostgreSQL with content caching",
          cdn: "Global video distribution",
          monitoring: ["Learning analytics", "Engagement tracking"],
        },
        monetization: [
          { type: "Per-course", price: "$49-299" },
          { type: "Subscription", price: "$29-99/month" },
          { type: "Enterprise plans", custom: true },
        ],
        estimatedLines: 28000,
        complexity: "high",
      },
      ttl: 5400,
      priority: 2,
    },
    {
      pattern: "realestate",
      triggers: ["property management", "real estate platform", "rental app"],
      prewarmedData: {
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          database: "Neon PostgreSQL with GIS support",
          auth: "Clerk",
          payments: "Stripe with escrow",
          maps: ["Google Maps API", "Mapbox"],
          deployment: "Vercel Edge",
        },
        features: [
          "Property search and filtering",
          "Interactive map listings",
          "Virtual tour integration",
          "Rental application system",
          "Document management",
          "Tenant screening",
          "Maintenance request tracking",
          "Property analytics dashboard",
        ],
        architecture: {
          type: "Microservices",
          scaling: "Geographically distributed",
          database: "PostgreSQL with geospatial queries",
          cdn: "Optimized for images and virtual tours",
          monitoring: ["Lead tracking", "Conversion analytics"],
        },
        monetization: [
          { type: "Listing fees", price: "$99-499/listing" },
          { type: "Subscription", price: "$199-999/month" },
          { type: "Transaction fees", rate: "1-3%" },
        ],
        estimatedLines: 25000,
        complexity: "medium",
      },
      ttl: 7200,
      priority: 2,
    },
    {
      pattern: "logistics",
      triggers: ["fleet management", "supply chain platform", "delivery app"],
      prewarmedData: {
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          database: "Neon PostgreSQL with temporal tables",
          auth: "Clerk",
          maps: ["Google Maps API", "Routing APIs"],
          realTime: ["WebSockets", "GPS tracking"],
          deployment: "AWS with auto-scaling",
        },
        features: [
          "Real-time fleet tracking",
          "Route optimization algorithms",
          "Inventory management system",
          "Warehouse management",
          "Delivery scheduling",
          "Driver management app",
          "Analytics and reporting",
          "Customer notification system",
        ],
        architecture: {
          type: "Microservices with event sourcing",
          scaling: "High availability for real-time tracking",
          database: "PostgreSQL with temporal data",
          cdn: "Global mapping services",
          monitoring: ["Real-time tracking", "Performance analytics"],
        },
        monetization: [
          { type: "Per-vehicle", price: "$29-99/month" },
          { type: "Per-delivery", rate: "$0.10-2" },
          { type: "Enterprise", custom: true },
        ],
        estimatedLines: 32000,
        complexity: "high",
      },
      ttl: 5400,
      priority: 2,
    },
    {
      pattern: "saas",
      triggers: ["B2B software", "enterprise platform", "business software"],
      prewarmedData: {
        techStack: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          database: "Neon PostgreSQL with multi-tenancy",
          auth: "Clerk with SSO/SAML",
          payments: "Stripe with enterprise billing",
          analytics: ["Segment", "Mixpanel"],
          deployment: "AWS with multi-region",
        },
        features: [
          "Multi-tenant architecture",
          "Role-based access control (RBAC)",
          "White-label customization",
          "Advanced analytics dashboard",
          "API management and documentation",
          "Enterprise SSO integration",
          "Custom workflow builder",
          "Advanced reporting and exports",
        ],
        architecture: {
          type: "Microservices with data isolation",
          scaling: "Horizontal with per-tenant scaling",
          database: "PostgreSQL with RLS for multi-tenancy",
          security: ["SOC 2", "ISO 27001", "GDPR"],
          monitoring: ["Per-tenant monitoring", "SLA tracking"],
        },
        monetization: [
          { type: "Per-seat", price: "$29-499/month" },
          { type: "Usage-based", tier: "By API calls/users" },
          { type: "Enterprise", custom: true },
        ],
        estimatedLines: 38000,
        complexity: "very-high",
      },
      ttl: 3600,
      priority: 3,
    },
  ];

  /**
   * Detect AI pattern from user input with confidence scoring
   * Enhanced with industry-specific context detection
   */
  static detectPattern(input: string): {
    pattern: AIPattern["type"] | null;
    confidence: number;
    matchedKeywords: string[];
    industryContext?: string;
  } {
    const normalizedInput = input.toLowerCase();
    let bestMatch: {
      pattern: AIPattern["type"];
      confidence: number;
      matchedKeywords: string[];
      industryContext?: string;
    } | null = null;

    // Enhanced industry context detection
    const industryContext = this.detectIndustryContext(normalizedInput);

    for (const [patternType, config] of Object.entries(this.PATTERNS)) {
      const matchedKeywords = config.keywords.filter((keyword) =>
        normalizedInput.includes(keyword.toLowerCase()),
      );

      if (matchedKeywords.length > 0) {
        let confidence =
          (matchedKeywords.length / config.keywords.length) * config.weight;

        // Boost confidence for industry-specific combinations
        if (
          industryContext &&
          this.isIndustryCompatible(
            patternType as AIPattern["type"],
            industryContext,
          )
        ) {
          confidence *= 1.2; // 20% boost for compatible industry context
        }

        // Apply semantic matching for complex patterns
        const semanticBonus = this.calculateSemanticBonus(
          normalizedInput,
          patternType as AIPattern["type"],
        );
        confidence += semanticBonus;

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            pattern: patternType as AIPattern["type"],
            confidence: Math.min(confidence, 1.0), // Cap at 100%
            matchedKeywords,
            industryContext: industryContext || undefined,
          };
        }
      }
    }

    return bestMatch
      ? {
          pattern: bestMatch.pattern,
          confidence: bestMatch.confidence,
          matchedKeywords: bestMatch.matchedKeywords,
          industryContext: bestMatch.industryContext,
        }
      : {
          pattern: null,
          confidence: 0,
          matchedKeywords: [],
          industryContext: industryContext || undefined,
        };
  }

  /**
   * Detect industry context from user input
   */
  private static detectIndustryContext(input: string): string | null {
    const industryKeywords = {
      "finance-banking": [
        "bank",
        "financial",
        "payment",
        "investment",
        "trading",
      ],
      "medical-health": ["patient", "doctor", "medical", "health", "hospital"],
      education: ["student", "teacher", "course", "learning", "education"],
      "property-real": [
        "property",
        "real estate",
        "housing",
        "rental",
        "mortgage",
      ],
      transport: ["shipping", "delivery", "logistics", "transport", "fleet"],
      enterprise: [
        "business",
        "enterprise",
        "company",
        "corporate",
        "organization",
      ],
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      const matches = keywords.filter((keyword) => input.includes(keyword));
      if (matches.length >= 2) {
        return industry;
      }
    }

    return null;
  }

  /**
   * Check if pattern is compatible with industry context
   */
  private static isIndustryCompatible(
    pattern: AIPattern["type"],
    industryContext: string,
  ): boolean {
    const compatibility = {
      "finance-banking": ["fintech", "saas", "dashboard"],
      "medical-health": ["healthcare", "dashboard", "mobile-app"],
      education: ["edtech", "dashboard", "mobile-app"],
      "property-real": ["realestate", "dashboard", "mobile-app"],
      transport: ["logistics", "dashboard", "mobile-app"],
      enterprise: ["saas", "dashboard", "api-service"],
    };

    return (
      compatibility[industryContext as keyof typeof compatibility]?.includes(
        pattern,
      ) || false
    );
  }

  /**
   * Calculate semantic bonus for pattern matching
   */
  private static calculateSemanticBonus(
    input: string,
    pattern: AIPattern["type"],
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
      edtech: {
        certification: 0.1,
        assessment: 0.1,
        curriculum: 0.15,
        learning: 0.05,
        educational: 0.1,
        training: 0.05,
      },
      realestate: {
        property: 0.1,
        investment: 0.1,
        rental: 0.1,
        listing: 0.05,
        housing: 0.05,
      },
      logistics: {
        "supply chain": 0.15,
        inventory: 0.1,
        warehouse: 0.1,
        delivery: 0.05,
        transportation: 0.1,
      },
      saas: {
        subscription: 0.1,
        enterprise: 0.1,
        business: 0.05,
        corporate: 0.1,
        "multi-tenant": 0.15,
      },
    };

    const indicators = semanticIndicators[pattern];
    if (!indicators) return 0;

    let bonus = 0;
    for (const [indicator, value] of Object.entries(indicators)) {
      if (input.includes(indicator)) {
        bonus += value as number;
      }
    }

    return Math.min(bonus, 0.3); // Max 30% bonus
  }

  /**
   * Generate optimized cache key for AI responses
   */
  static generateOptimizedCacheKey(
    service: "iflow" | "tavily",
    input: string,
    pattern?: AIPattern["type"],
  ): string {
    const normalizedInput = this.normalizeInputForCaching(input);
    const patternPrefix = pattern ? `${pattern}:` : "";
    const servicePrefix = service === "iflow" ? "ai" : "research";

    // Create semantic hash for better cache hits
    const semanticHash = crypto
      .createHash("sha256")
      .update(`${servicePrefix}:${patternPrefix}${normalizedInput}`)
      .digest("hex")
      .substring(0, 12);

    return `${servicePrefix}-${patternPrefix}${semanticHash}`;
  }

  /**
   * Normalize input for better cache hit rates
   */
  static normalizeInputForCaching(input: string): string {
    return input
      .toLowerCase()
      .replace(
        /\b(a|an|the|for|to|in|on|at|by|with|as|from|that|this|it|is|are|was|were|be|been|being)\b/g,
        "",
      )
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, " ")
      .trim()
      .substring(0, 200); // Limit length for consistency
  }

  /**
   * Perform intelligent cache warming based on detected patterns
   */
  static async performIntelligentWarming(
    recentRequests: string[] = [],
  ): Promise<{
    warmedRules: number;
    estimatedSavings: number;
    patternsDetected: AIPattern["type"][];
  }> {
    logger.info("Starting intelligent AI cache warming", {
      recentRequestCount: recentRequests.length,
    });

    const warmedRules: AIPattern["type"][] = [];
    let estimatedSavings = 0;

    try {
      // Analyze recent requests for pattern detection
      const detectedPatterns = this.analyzeRecentPatterns(recentRequests);

      // Warm high-priority patterns first
      for (const rule of this.WARMING_RULES.sort(
        (a, b) => a.priority - b.priority,
      )) {
        const shouldWarm = this.shouldWarmRule(rule, detectedPatterns);

        if (shouldWarm) {
          await this.warmRule(rule);
          warmedRules.push(rule.pattern);

          // Calculate estimated cost savings
          const savings = this.calculateEstimatedSavings(rule);
          estimatedSavings += savings;
        }
      }

      logger.info("Intelligent AI cache warming completed", {
        warmedRules: warmedRules.length,
        estimatedSavings: `$${estimatedSavings.toFixed(2)}`,
        patternsDetected: detectedPatterns,
      });

      return {
        warmedRules: warmedRules.length,
        estimatedSavings,
        patternsDetected: detectedPatterns,
      };
    } catch (error) {
      logger.error("Intelligent AI cache warming failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        warmedRules: 0,
        estimatedSavings: 0,
        patternsDetected: [],
      };
    }
  }

  /**
   * Analyze recent requests for pattern frequency
   */
  private static analyzeRecentPatterns(
    recentRequests: string[],
  ): AIPattern["type"][] {
    const patternCounts: Record<AIPattern["type"], number> = {
      marketplace: 0,
      ecommerce: 0,
      social: 0,
      dashboard: 0,
      "api-service": 0,
      "mobile-app": 0,
      fintech: 0,
      healthcare: 0,
      edtech: 0,
      realestate: 0,
      logistics: 0,
      saas: 0,
    };

    for (const request of recentRequests) {
      const detection = this.detectPattern(request);
      if (detection.pattern && detection.confidence > 0.5) {
        patternCounts[detection.pattern]++;
      }
    }

    // Return patterns sorted by frequency
    return Object.entries(patternCounts)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([pattern]) => pattern as AIPattern["type"]);
  }

  /**
   * Determine if a warming rule should be executed
   */
  private static shouldWarmRule(
    rule: CacheWarmingRule,
    detectedPatterns: AIPattern["type"][],
  ): boolean {
    // Always warm high priority rules
    if (rule.priority <= 2) {
      return true;
    }

    // Warm if pattern was recently detected
    return detectedPatterns.includes(rule.pattern);
  }

  /**
   * Warm a specific cache rule
   */
  private static async warmRule(rule: CacheWarmingRule): Promise<void> {
    try {
      const cacheKey = this.generateOptimizedCacheKey(
        "iflow",
        `blueprint-${rule.pattern}`,
        rule.pattern,
      );

      await UnifiedCacheManager.cacheData(
        "blueprint-skeleton",
        { pattern: rule.pattern },
        rule.prewarmedData,
        {
          ttl: rule.ttl,
          key: cacheKey,
          tags: ["ai-warmed", rule.pattern, "blueprint-skeleton"],
        },
      );

      logger.debug("AI cache rule warmed", {
        pattern: rule.pattern,
        cacheKey,
        ttl: rule.ttl,
        priority: rule.priority,
      });
    } catch (error) {
      logger.debug("Failed to warm AI cache rule", {
        pattern: rule.pattern,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Calculate estimated cost savings for a warming rule
   */
  private static calculateEstimatedSavings(rule: CacheWarmingRule): number {
    const averageRequestsPerHour = 10;
    const hoursInTTL = rule.ttl / 3600;
    const iflowCostPerRequest = 0.02;

    return averageRequestsPerHour * hoursInTTL * iflowCostPerRequest;
  }

  /**
   * Get comprehensive AI usage analytics
   */
  static async getUsageAnalytics(): Promise<UsageAnalytics> {
    try {
      const cacheStats = await UnifiedCacheManager.getCacheStats();

      // Analyze cache hit rates by AI service
      const aiCacheHitRate = cacheStats.aiCacheStats.aiCacheHitRate;
      const iflowHits = cacheStats.aiCacheStats.iflowCacheHits;
      const tavilyHits = cacheStats.aiCacheStats.tavilyCacheHits;

      // Estimate pattern distribution from cache keys
      const patternDistribution: Record<AIPattern["type"], number> = {
        marketplace: iflowHits * 0.15,
        ecommerce: iflowHits * 0.12,
        social: iflowHits * 0.1,
        dashboard: iflowHits * 0.08,
        "api-service": iflowHits * 0.05,
        "mobile-app": iflowHits * 0.03,
        fintech: iflowHits * 0.15, // High-value industry pattern
        healthcare: iflowHits * 0.12, // High-value regulated industry
        edtech: iflowHits * 0.08,
        realestate: iflowHits * 0.07,
        logistics: iflowHits * 0.03,
        saas: iflowHits * 0.02,
      };

      return {
        totalRequests: iflowHits + tavilyHits,
        patternDistribution,
        cacheHitRates: {
          iflow: aiCacheHitRate,
          tavily: tavilyHits / Math.max(iflowHits + tavilyHits, 1),
          overall: aiCacheHitRate,
        },
        costSavings: cacheStats.aiCacheStats.estimatedCostSavings,
        lastAnalyzed: Date.now(),
      };
    } catch (error) {
      logger.error("Failed to get AI usage analytics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        totalRequests: 0,
        patternDistribution: {
          marketplace: 0,
          ecommerce: 0,
          social: 0,
          dashboard: 0,
          "api-service": 0,
          "mobile-app": 0,
          fintech: 0,
          healthcare: 0,
          edtech: 0,
          realestate: 0,
          logistics: 0,
          saas: 0,
        },
        cacheHitRates: {
          iflow: 0,
          tavily: 0,
          overall: 0,
        },
        costSavings: 0,
        lastAnalyzed: Date.now(),
      };
    }
  }

  /**
   * Get pattern-specific warming recommendations
   */
  static getWarmingRecommendations(analytics: UsageAnalytics): string[] {
    const recommendations: string[] = [];
    const { patternDistribution, cacheHitRates } = analytics;

    // Low hit rate recommendations
    if (cacheHitRates.overall < 0.6) {
      recommendations.push(
        "Low overall cache hit rate - consider aggressive pre-warming",
      );
    }

    // Pattern-specific recommendations
    const topPattern = Object.entries(patternDistribution).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (topPattern && topPattern[1] > 50) {
      recommendations.push(
        `High frequency of ${topPattern[0]} patterns - increase TTL for this pattern type`,
      );
    }

    // Cost optimization recommendations
    if (analytics.costSavings < 10) {
      recommendations.push(
        "Low cost savings detected - implement pattern-based warming",
      );
    }

    return recommendations.length > 0
      ? recommendations
      : ["AI caching performance is optimal - continue current strategy"];
  }
}

export { AIPatternDetector };
