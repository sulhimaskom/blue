import { generateOpenAPISpec } from "@/lib/services/api-documentation-service";
import { NextResponse } from "next/server";

/**
 * OpenAPI JSON Endpoint
 *
 * Returns the complete OpenAPI 3.0.3 specification as JSON
 * Downloadable for use with Swagger UI, Postman, or automated tools
 */
export async function GET() {
  const spec = generateOpenAPISpec();

  return new NextResponse(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
