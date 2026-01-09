/**
 * SEC-001: Security Headers Enhancement Test Suite
 *
 * Tests comprehensive security header implementation in middleware
 * - Content Security Policy (CSP) for XSS prevention
 * - Strict-Transport-Security (HSTS) for HTTPS enforcement
 * - Permissions-Policy for browser feature restrictions
 * - Existing security headers validation
 */

import { NextRequest } from "next/server";
import middleware from "../middleware";

describe("SEC-001 Security Headers Enhancement", () => {
  describe("Content Security Policy (CSP) - XSS Prevention", () => {
    it("should include Content-Security-Policy header in all responses", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toBeDefined();
      expect(csp).toBeTruthy();
    });

    it("should enforce default-src 'self' restriction", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("default-src 'self'");
    });

    it("should allow inline scripts for Next.js compatibility", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");
    });

    it("should allow inline styles for Tailwind CSS", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it("should block frames and objects", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("object-src 'none'");
    });

    it("should enforce upgrade-insecure-requests", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("upgrade-insecure-requests");
    });

    it("should restrict form actions to same origin", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("form-action 'self'");
    });

    it("should deny framing via frame-ancestors", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe("Strict-Transport-Security (HSTS) - HTTPS Enforcement", () => {
    const originalEnv = process.env.NODE_ENV;

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should include Strict-Transport-Security header in production", () => {
      process.env.NODE_ENV = "production";
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const hsts = response.headers.get("Strict-Transport-Security");
      expect(hsts).toBeDefined();
      expect(hsts).toContain("max-age=31536000");
      expect(hsts).toContain("includeSubDomains");
      expect(hsts).toContain("preload");
    });

    it("should use shorter HSTS duration in development", () => {
      process.env.NODE_ENV = "development";
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const hsts = response.headers.get("Strict-Transport-Security");
      expect(hsts).toBeDefined();
      expect(hsts).toContain("max-age=300");
      expect(hsts).toContain("includeSubDomains");
      expect(hsts).not.toContain("preload");
    });
  });

  describe("Permissions-Policy - Browser Feature Restrictions", () => {
    it("should include Permissions-Policy header", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const permissions = response.headers.get("Permissions-Policy");
      expect(permissions).toBeDefined();
    });

    it("should block camera access by default", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const permissions = response.headers.get("Permissions-Policy");
      expect(permissions).toContain("camera=()");
    });

    it("should block microphone access by default", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const permissions = response.headers.get("Permissions-Policy");
      expect(permissions).toContain("microphone=()");
    });

    it("should block geolocation access by default", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const permissions = response.headers.get("Permissions-Policy");
      expect(permissions).toContain("geolocation=()");
    });
  });

  describe("Existing Security Headers - Maintained Compliance", () => {
    it("should include X-Content-Type-Options: nosniff", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const xContentType = response.headers.get("X-Content-Type-Options");
      expect(xContentType).toBe("nosniff");
    });

    it("should include X-Frame-Options: DENY", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const xFrameOptions = response.headers.get("X-Frame-Options");
      expect(xFrameOptions).toBe("DENY");
    });

    it("should include X-XSS-Protection: 1; mode=block", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const xXssProtection = response.headers.get("X-XSS-Protection");
      expect(xXssProtection).toBe("1; mode=block");
    });

    it("should include Referrer-Policy: strict-origin-when-cross-origin", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      const referrerPolicy = response.headers.get("Referrer-Policy");
      expect(referrerPolicy).toBe("strict-origin-when-cross-origin");
    });
  });

  describe("Security Header Integration - Comprehensive Coverage", () => {
    it("should include all security headers simultaneously", () => {
      const request = new NextRequest(new Request("http://localhost:3000/api/test"));
      const response = middleware(request);

      expect(response.headers.get("Content-Security-Policy")).toBeDefined();
      expect(response.headers.get("Strict-Transport-Security")).toBeDefined();
      expect(response.headers.get("Permissions-Policy")).toBeDefined();
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
      expect(response.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin",
      );
    });

    it("should maintain CORS compatibility with security headers", () => {
      const request = new NextRequest(
        new Request("http://localhost:3000/api/test", {
          method: "OPTIONS",
          headers: new Headers({ Origin: "http://localhost:3000" }),
        }),
      );

      const response = middleware(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    });
  });
});
