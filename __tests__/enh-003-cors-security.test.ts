/**
 * ENH-003: CORS Configuration Security Enhancement Tests
 *
 * Tests production-grade CORS configuration with origin restrictions
 */

import { getAllowedOrigin } from "../lib/api-utils";
import { env } from "../lib/env";
import { describe, it, expect, jest } from "@jest/globals";

describe("CORS Security Configuration - ENH-003", () => {
  let originalEnv: any;

  beforeEach(() => {
    // Save original env values
    originalEnv = {
      NODE_ENV: env.NODE_ENV,
      ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
      NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    };
  });

  afterEach(() => {
    // Restore original env values
    jest.restoreAllMocks();
  });

  describe("Development Mode", () => {
    beforeEach(() => {
      jest.replaceProperty(env, "NODE_ENV", "development");
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "");
      jest.replaceProperty(env, "NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    });

    it("should allow all origins (*) in development mode", () => {
      const result = getAllowedOrigin("https://malicious-site.com");
      expect(result).toBe("*");
    });

    it("should allow all origins without request origin in development", () => {
      const result = getAllowedOrigin();
      expect(result).toBe("*");
    });

    it("should ignore ALLOWED_ORIGINS config in development", () => {
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "https://allowed-site.com");
      const result = getAllowedOrigin("https://any-site.com");
      expect(result).toBe("*");
    });
  });

  describe("Production Mode with ALLOWED_ORIGINS", () => {
    beforeEach(() => {
      jest.replaceProperty(env, "NODE_ENV", "production");
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "");
    });

    it("should allow origins that are in ALLOWED_ORIGINS list", () => {
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "https://trusted.com,https://api.trusted.com");
      const result = getAllowedOrigin("https://trusted.com");
      expect(result).toBe("https://trusted.com");
    });

    it("should reject origins not in ALLOWED_ORIGINS list and default to same-origin (security)", () => {
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "https://trusted.com,https://api.trusted.com");
      const result = getAllowedOrigin("https://malicious.com");
      expect(result).toBe("same-origin"); // Security: reject unknown origins
    });

    it("should handle comma-separated origins correctly", () => {
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "https://site1.com,https://site2.com,https://site3.com");
      expect(getAllowedOrigin("https://site2.com")).toBe("https://site2.com");
      expect(getAllowedOrigin("https://unknown.com")).toBe("same-origin"); // Security: reject unknown origins
    });

    it("should handle whitespace in ALLOWED_ORIGINS", () => {
      jest.replaceProperty(env, "ALLOWED_ORIGINS", " https://trusted.com , https://api.trusted.com ");
      const result = getAllowedOrigin("https://api.trusted.com");
      expect(result).toBe("https://api.trusted.com");
    });

    it("should work with single origin in production", () => {
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "https://only-trusted.com");
      expect(getAllowedOrigin("https://only-trusted.com")).toBe(
        "https://only-trusted.com",
      );
      expect(getAllowedOrigin("https://other.com")).toBe("same-origin"); // Security: reject unknown origins
    });
  });

  describe("Production Mode with NEXT_PUBLIC_APP_URL", () => {
    beforeEach(() => {
      jest.replaceProperty(env, "NODE_ENV", "production");
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "");
    });

    it("should use NEXT_PUBLIC_APP_URL when no ALLOWED_ORIGINS configured", () => {
      jest.replaceProperty(env, "NEXT_PUBLIC_APP_URL", "https://my-app.com");
      const result = getAllowedOrigin("https://malicious.com");
      expect(result).toBe("https://my-app.com");
    });

    it("should use NEXT_PUBLIC_APP_URL when requested origin and no ALLOWED_ORIGINS", () => {
      jest.replaceProperty(env, "NEXT_PUBLIC_APP_URL", "https://my-app.com");
      const result = getAllowedOrigin();
      expect(result).toBe("https://my-app.com");
    });
  });

  describe("Production Mode - Security Fallbacks", () => {
    beforeEach(() => {
      jest.replaceProperty(env, "NODE_ENV", "production");
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "");
      jest.replaceProperty(env, "NEXT_PUBLIC_APP_URL", "");
    });

    it("should use same-origin when no configuration provided (most secure)", () => {
      const result = getAllowedOrigin("https://unknown-origin.com");
      expect(result).toBe("same-origin");
    });

    it("should use same-origin when no origin requested in production", () => {
      const result = getAllowedOrigin();
      expect(result).toBe("same-origin");
    });
  });

  describe("Security Configuration Validation", () => {
    it("prevents wildcard origin in production by default", () => {
      jest.replaceProperty(env, "NODE_ENV", "production");
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "");
      jest.replaceProperty(env, "NEXT_PUBLIC_APP_URL", "");

      const result = getAllowedOrigin("https://any-origin.com");
      expect(result).not.toBe("*");
      expect(result).toBe("same-origin");
    });

    it("ensures production requires explicit configuration for external domains", () => {
      jest.replaceProperty(env, "NODE_ENV", "production");
      jest.replaceProperty(env, "ALLOWED_ORIGINS", "");
      jest.replaceProperty(env, "NEXT_PUBLIC_APP_URL", "");
      const result = getAllowedOrigin("https://external-domain.com");
      expect(result).not.toBe("*");
    });
  });
});
