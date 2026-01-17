import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { generateAPIDocumentation } from "@/lib/services/api-documentation-service";
import { RateLimiters } from "@/lib/rate-limit-config";

/**
 * OpenAPI Specification Endpoint
 *
 * Returns machine-readable OpenAPI 3.0.3 specification for all API endpoints
 * Used by Swagger UI and automated client generation tools
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false,
  rateLimiter: (identifier: string) => RateLimiters.permissive()(identifier),
  handler: async () => {
    const spec = generateAPIDocumentation();

    return {
      specification: spec,
      docsUrl: "/api/docs",
      swaggerUrl: "/api/docs/swagger",
    };
  },
});
