import { z } from "zod";

/**
 * EnvironmentError - Error class for environment validation failures
 */
export class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentError";
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Database
  DATABASE_URL: z.string().url().min(1, "Database URL is required"),

  // AI Services
  IFLOW_API_KEY: z.string().min(1, "IFlow API key is required"),
  IFLOW_BASE_URL: z.string().url().default("https://api.models.dev/v1"),
  TAVILY_API_KEY: z.string().min(1, "Tavily API key is required"),

  // OpenAI (Optional - Alternative AI provider)
  OPENAI_API_KEY: z.string().optional(),

  // Authentication (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "Clerk publishable key is required"),
  CLERK_SECRET_KEY: z.string().min(1, "Clerk secret key is required"),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Payments (Stripe)
  STRIPE_SECRET_KEY: z.string().min(1, "Stripe secret key is required"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "Stripe publishable key is required"),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_WEBHOOK_SECRETS_ADDITIONAL: z.string().optional(),
  NPM_PACKAGE_VERSION: z.string().default("1.0.0"),
  SENTRY_DSN: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),

  // GitHub
  GITHUB_ACCESS_TOKEN: z.string().min(1, "GitHub access token is required"),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Redis (Optional - will fall back to in-memory if not provided)
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Email Service (Optional - Resend for transactional emails)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // Application Configuration
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Architect Platform"),
  ALLOWED_ORIGINS: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const nodeEnv = process.env.NODE_ENV || "development";
  
  // Skip validation during build time - Next.js will handle runtime validation
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return {
      NODE_ENV: "production",
      DATABASE_URL: "placeholder",
      IFLOW_API_KEY: "placeholder",
      IFLOW_BASE_URL: "placeholder",
      TAVILY_API_KEY: "placeholder",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "placeholder",
      CLERK_SECRET_KEY: "placeholder",
      STRIPE_SECRET_KEY: "placeholder",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "placeholder",
      GITHUB_ACCESS_TOKEN: "placeholder",
      GITHUB_APP_ID: "",
      GITHUB_APP_PRIVATE_KEY: "",
      GITHUB_WEBHOOK_SECRET: "",
      CLERK_WEBHOOK_SECRET: "",
      STRIPE_WEBHOOK_SECRET: "",
      STRIPE_WEBHOOK_SECRETS_ADDITIONAL: "",
      NPM_PACKAGE_VERSION: "1.0.0",
      SENTRY_DSN: "",
      SENTRY_RELEASE: "",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_NAME: "Architect Platform",
      OPENAI_API_KEY: "",
      ALLOWED_ORIGINS: "",
    } as Env;
  }

  // Test environment allows fallback values for local development without full setup
  if (nodeEnv === "test") {
    return {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL || "postgresql://test:test@localhost/test",
      IFLOW_API_KEY: process.env.IFLOW_API_KEY || "test-iflow-key",
      IFLOW_BASE_URL: process.env.IFLOW_BASE_URL || "https://test.api.com",
      TAVILY_API_KEY: process.env.TAVILY_API_KEY || "test-tavily-key",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
        "test-clerk-publishable",
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "test-clerk-secret",
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "test-stripe-secret",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        "test-stripe-publishable",
      GITHUB_ACCESS_TOKEN:
        process.env.GITHUB_ACCESS_TOKEN || "test-github-token",
      GITHUB_APP_ID: process.env.GITHUB_APP_ID || "",
      GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY || "",
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || "",
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || "",
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
      STRIPE_WEBHOOK_SECRETS_ADDITIONAL: process.env.STRIPE_WEBHOOK_SECRETS_ADDITIONAL || "",
      NPM_PACKAGE_VERSION: process.env.npm_package_version || "1.0.0",
      SENTRY_DSN: process.env.SENTRY_DSN || "",
      SENTRY_RELEASE: process.env.SENTRY_RELEASE || "",
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Architect Platform",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "",
    } as Env;
  }

  // Development and production environments use strict Zod validation
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");
      throw new EnvironmentError(
        `Environment validation failed:\n${missingVars}\n\nPlease check your .env configuration and ensure all required environment variables are set.\n\nSee .env.example for the required variables.`,
      );
    }
    throw error;
  }
}

export const env = validateEnv();

export type { Env };
