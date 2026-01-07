import { z } from "zod";

// User input validation schemas
export const UserSchemas = {
  // User profile updates
  updateProfile: z.object({
    email: z.string().email("Invalid email format").optional(),
    // Add other profile fields as needed
  }),

  // Credit operations
  addCredits: z.object({
    amount: z.number().int().positive("Amount must be positive"),
    paymentMethodId: z.string().min(1, "Payment method is required"),
  }),
};

// Project validation schemas
export const ProjectSchemas = {
  // Create new project
  create: z.object({
    name: z
      .string()
      .min(1, "Project name is required")
      .max(100, "Project name must be less than 100 characters")
      .regex(/^[a-zA-Z0-9\s-_]+$/, "Project name contains invalid characters"),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
  }),

  // Update project
  update: z.object({
    name: z
      .string()
      .min(1, "Project name is required")
      .max(100, "Project name must be less than 100 characters")
      .regex(/^[a-zA-Z0-9\s-_]+$/, "Project name contains invalid characters")
      .optional(),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
    status: z.enum(["draft", "generating", "completed", "deployed"]).optional(),
  }),

  // Generate blueprint from user input
  generateBlueprint: z.object({
    input: z
      .string()
      .min(10, "Input must be at least 10 characters long")
      .max(2000, "Input must be less than 2000 characters")
      .transform((val: string) => val.trim()),
  }),

  // Search parameters
  search: z.object({
    query: z.string().min(1, "Search query is required").max(100),
  }),
};

// Blueprint validation schemas
export const BlueprintSchemas = {
  // Create blueprint version
  create: z.object({
    projectId: z.string().uuid("Invalid project ID"),
    contentMarkdown: z.string().min(1, "Blueprint content is required"),
    structuredData: z
      .record(z.any())
      .refine(
        (data: any) => data && typeof data === "object",
        "Structured data must be a valid object",
      ),
  }),

  // Update blueprint
  update: z.object({
    contentMarkdown: z
      .string()
      .min(1, "Blueprint content is required")
      .optional(),
    structuredData: z
      .record(z.any())
      .refine(
        (data: any) => data && typeof data === "object",
        "Structured data must be a valid object",
      )
      .optional(),
  }),
};

// API Request/Response validation
export const ApiSchemas = {
  // Generic API response wrapper
  response: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  }),

  // Pagination parameters
  pagination: z.object({
    page: z.coerce.number().int().positive().min(1).default(1),
    limit: z.coerce.number().int().positive().min(1).max(100).default(20),
  }),

  // Search parameters
  search: z.object({
    query: z.string().min(1, "Search query is required").max(100),
    filters: z.record(z.any()).optional(),
  }),
};

// Environment variable validation (for runtime checks)
export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "Clerk public key is required"),
  CLERK_SECRET_KEY: z.string().min(1, "Clerk secret key is required"),
  // Add other required env vars as needed
});

// Type exports
export type CreateProjectInput = z.infer<typeof ProjectSchemas.create>;
export type UpdateProjectInput = z.infer<typeof ProjectSchemas.update>;
export type GenerateBlueprintInput = z.infer<
  typeof ProjectSchemas.generateBlueprint
>;
export type CreateBlueprintInput = z.infer<typeof BlueprintSchemas.create>;
export type UpdateBlueprintInput = z.infer<typeof BlueprintSchemas.update>;
