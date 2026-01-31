// Enhanced middleware with production-grade security headers and CORS handling
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

// Helper function to determine allowed origin
function getAllowedOrigin(requestedOrigin?: string): string {
  // In production, restrict CORS to approved domains only
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : [];

    // If no allowed origins configured, default to same-origin for security
    if (allowedOrigins.length === 0) {
      return env.NEXT_PUBLIC_APP_URL || "same-origin";
    }

    // If specific origin requested and it's in allowed list, use it
    if (requestedOrigin && allowedOrigins.includes(requestedOrigin)) {
      return requestedOrigin;
    }

    // Otherwise, use first allowed origin or same-origin
    return (
      allowedOrigins[0] || env.NEXT_PUBLIC_APP_URL || "same-origin"
    );
  }

  // In development, allow all origins for convenience
  return "*";
}

// Helper function to get CSP policy
function getContentSecurityPolicy(): string {
  const appUrl = env.NEXT_PUBLIC_APP_URL || "";

  // Base CSP directives
  const csp = [
    // Default to self for all content types
    "default-src 'self'",
    // Script sources: allow inline for Next.js and self
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    // Style sources: allow inline for Tailwind CSS and self
    "style-src 'self' 'unsafe-inline'",
    // Image sources: allow data URLs, Next.js images, and self
    "img-src 'self' data: blob: https:",
    // Font sources: allow self
    "font-src 'self' data:",
    // Frame sources: deny by default
    "frame-src 'none'",
    // Object sources: deny by default
    "object-src 'none'",
    // Base URI: restrict to current origin
    "base-uri 'self'",
    // Form action: restrict to current origin
    "form-action 'self'",
    // Frame ancestors: deny framing
    "frame-ancestors 'none'",
    // Upgrade insecure requests
    "upgrade-insecure-requests",
    // Plugin types: block plugins
    "plugin-types 'application/pdf'",
    // Worker sources: allow self and blob URLs
    "worker-src 'self' blob:",
    // Manifest sources: allow self
    "manifest-src 'self'",
  ];

  // Add external domains if configured (e.g., CDN, analytics)
  if (appUrl && env.NODE_ENV === "production") {
    csp.push(`connect-src 'self' ${appUrl} https://api.stripe.com`);
    csp.push(`script-src 'self' 'unsafe-eval' 'unsafe-inline' ${appUrl}`);
  } else {
    csp.push("connect-src 'self' https://api.stripe.com");
  }

  // Return CSP as header value
  return csp.join("; ");
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

  // Development mode: Authentication bypassed (no logging in Edge Runtime)

  // For regular requests, continue to API routes which will handle CORS headers
  const response = NextResponse.next();

  // Add production-grade security headers to all responses
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Add Content Security Policy (CSP) for XSS prevention
  const csp = getContentSecurityPolicy();
  response.headers.set("Content-Security-Policy", csp);

  // Add Strict-Transport-Security (HSTS) for HTTPS enforcement in production
  if (env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  } else {
    // In development, use shorter HSTS duration for testing
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=300; includeSubDomains",
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};