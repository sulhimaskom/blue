/**
 * Centralized form utilities
 * Provides consistent form behavior and ID generation across components
 * Follows Service Layer principles and Atomic Modularity
 */

/**
 * Generate unique form element ID
 * @param prefix - Optional prefix for the ID (e.g., "input", "select", "textarea")
 * @returns Unique form element identifier
 */
export function generateFormId(prefix: string = "form"): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Validate form field value based on rules
 * @param value - Value to validate
 * @param rules - Validation rules object
 * @returns Validation result with validity status and error message
 */
export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  custom?: (inputValue: string) => string | null; // eslint-disable-line no-unused-vars
}

export interface ValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}

export function validateFormField(
  value: string,
  rules: ValidationRules,
): ValidationResult {
  // Required validation
  if (rules.required && (!value || value.trim().length === 0)) {
    return {
      isValid: false,
      errorMessage: "This field is required",
    };
  }

  // Min length validation
  if (rules.minLength && value.length < rules.minLength) {
    return {
      isValid: false,
      errorMessage: `Must be at least ${rules.minLength} characters`,
    };
  }

  // Max length validation
  if (rules.maxLength && value.length > rules.maxLength) {
    return {
      isValid: false,
      errorMessage: `Must be no more than ${rules.maxLength} characters`,
    };
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    return {
      isValid: false,
      errorMessage: "Invalid format",
    };
  }

  // Email validation
  if (rules.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        isValid: false,
        errorMessage: "Please enter a valid email address",
      };
    }
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      return {
        isValid: false,
        errorMessage: customError,
      };
    }
  }

  return {
    isValid: true,
    errorMessage: null,
  };
}

/**
 * Sanitize form input to prevent XSS
 * @param input - Raw user input
 * @returns Sanitized input string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Format form value for display (e.g., phone numbers, currency)
 * @param value - Raw value
 * @param type - Format type
 * @returns Formatted value string
 */
type FormatType = "phone" | "currency" | "uppercase" | "lowercase";

export function formatFormValue(value: string, type: FormatType): string {
  switch (type) {
    case "phone":
      // Simple US phone formatting
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(
          3,
          6,
        )}-${cleaned.substring(6)}`;
      }
      return value;
    case "currency":
      const numValue = parseFloat(value.replace(/[^0-9.-]/g, ""));
      if (!isNaN(numValue)) {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(numValue);
      }
      return value;
    case "uppercase":
      return value.toUpperCase();
    case "lowercase":
      return value.toLowerCase();
    default:
      return value;
  }
}
