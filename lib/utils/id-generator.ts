/**
 * ID Generator Utility
 *
 * Centralized ID generation for consistent, secure, and
 * testable identifier creation across the application.
 */

import * as crypto from "crypto";

export interface IDGeneratorConfig {
  prefix?: string;
  length?: number;
  encoding?: "hex" | "base64" | "base64url";
}

/**
 * Generate cryptographically secure random IDs
 * Replaces hardcoded Date.now() + Math.random() patterns
 */
export class IDGenerator {
  /**
   * Generate a unique ID with optional prefix
   */
  static generateId(config: IDGeneratorConfig = {}): string {
    const { prefix = "", length = 16, encoding = "hex" } = config;

    // Generate cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(Math.ceil(length / 2));

    // Convert to desired encoding
    let randomId: string;
    switch (encoding) {
      case "base64":
        randomId = randomBytes
          .toString("base64")
          .replace(/[+/=]/g, "")
          .substring(0, length);
        break;
      case "base64url":
        randomId = randomBytes.toString("base64url").substring(0, length);
        break;
      case "hex":
      default:
        randomId = randomBytes.toString("hex").substring(0, length);
        break;
    }

    return prefix ? `${prefix}_${randomId}` : randomId;
  }

  /**
   * Generate Stripe-style payment ID
   */
  static generatePaymentId(mock = false): string {
    return this.generateId({
      prefix: mock ? "pi_mock" : "pi",
      length: 24,
      encoding: "hex",
    });
  }

  /**
   * Generate alert ID for monitoring
   */
  static generateAlertId(type: string = "alert"): string {
    return this.generateId({
      prefix: type,
      length: 20,
      encoding: "hex",
    });
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return this.generateId({
      prefix: "sess",
      length: 32,
      encoding: "hex",
    });
  }

  /**
   * Generate request tracking ID
   */
  static generateRequestId(): string {
    return this.generateId({
      prefix: "req",
      length: 16,
      encoding: "hex",
    });
  }

  /**
   * Generate test-friendly deterministic ID (for testing only)
   */
  static generateTestId(seed: string): string {
    const hash = crypto.createHash("sha256").update(seed).digest("hex");
    return `test_${hash.substring(0, 16)}`;
  }
}

// Predefined ID generators for common use cases
export const IdGenerators = {
  PAYMENT: () => IDGenerator.generatePaymentId(true), // Mock payment for development
  ALERT: (type?: string) => IDGenerator.generateAlertId(type),
  SESSION: () => IDGenerator.generateSessionId(),
  REQUEST: () => IDGenerator.generateRequestId(),
  TRANSACTION: () =>
    IDGenerator.generateId({ prefix: "txn", length: 24, encoding: "hex" }),
  WEBHOOK: () =>
    IDGenerator.generateId({ prefix: "wh", length: 16, encoding: "hex" }),
  BLUEPRINT: () =>
    IDGenerator.generateId({ prefix: "bp", length: 16, encoding: "hex" }),
  GENERIC: (prefix?: string) => IDGenerator.generateId({ prefix }),
} as const;
