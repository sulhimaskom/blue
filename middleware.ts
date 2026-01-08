// Enhanced middleware with CORS preflight handling for production security
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper function to determine allowed origin
function getAllowedOrigin(requestedOrigin?: string): string {
  // In production, restrict CORS to approved domains only
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : [];

    // If no allowed origins configured, default to same-origin for security
    if (allowedOrigins.length === 0) {
      return process.env.NEXT_PUBLIC_APP_URL || "same-origin";
    }

    // If specific origin requested and it's in allowed list, use it
    if (requestedOrigin && allowedOrigins.includes(requestedOrigin)) {
      return requestedOrigin;
    }

    // Otherwise, use the first allowed origin or same-origin
    return (
      allowedOrigins[0] || process.env.NEXT_PUBLIC_APP_URL || "same-origin"
    );
  }

  // In development, allow all origins for convenience
  return "*";
}

export default function middleware(req: NextRequest) {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 200 });

    const origin = req.headers.get("origin");
    const allowedOrigin = getAllowedOrigin(origin || undefined);

    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

    return response;
  }

  // Log that we're running in development mode without authentication
  if (process.env.NODE_ENV === "development") {
    console.log("🚧 Development mode: Authentication bypassed");
  }

  // For regular requests, continue to API routes which will handle CORS headers
  const response = NextResponse.next();

  // Add security headers to all responses
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
