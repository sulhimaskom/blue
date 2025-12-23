import { z } from "zod";

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

  // Authentication (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "Clerk publishable key is required"),
  CLERK_SECRET_KEY: z.string().min(1, "Clerk secret key is required"),

  // Payments (Stripe)
  STRIPE_SECRET_KEY: z.string().min(1, "Stripe secret key is required"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "Stripe publishable key is required"),

  // GitHub
  GITHUB_ACCESS_TOKEN: z.string().min(1, "GitHub access token is required"),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
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
    } as Env;
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

export const env = validateEnv();

export type { Env };
