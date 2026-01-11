/**
 * Color Validation Utilities
 *
 * Provides secure color validation for hex color values used in the UI.
 * Prevents XSS vulnerabilities by validating color strings before use in inline styles.
 */

/**
 * Validates a hex color string and returns a safe default if invalid
 * @param color - The color string to validate (should be hex format like #RRGGBB)
 * @param fallback - Default color to return if validation fails (default: #000000)
 * @returns A valid hex color string
 */
export function validateHexColor(
  color: string | undefined | null,
  fallback: string = "#000000"
): string {
  if (!color || typeof color !== "string") {
    return fallback;
  }

  const hexRegex = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  const match = color.match(hexRegex);

  if (!match) {
    return fallback;
  }

  const hexValue = match[1];

  if (hexValue.length === 3) {
    return `#${hexValue[0]}${hexValue[0]}${hexValue[1]}${hexValue[1]}${hexValue[2]}${hexValue[2]}`;
  }

  return `#${hexValue}`;
}

/**
 * Checks if a color string is a valid hex color
 * @param color - The color string to validate
 * @returns true if valid hex color, false otherwise
 */
export function isValidHexColor(color: string | undefined | null): boolean {
  if (!color || typeof color !== "string") {
    return false;
  }

  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}
