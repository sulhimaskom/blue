import React from "react";
import { cn, getTextColor } from "@/lib/constants/ui-themes";

export interface ColorInputProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Atomic color input component for theme customization
 * Follows LEGO principles - reusable across any color selection interface
 */
export function ColorInput({
  label,
  value = "#000000", // eslint-disable-line no-unused-vars
  onChange,
  placeholder = "#000000",
  helperText,
  error,
  disabled = false,
  className,
  ...props
}: ColorInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Basic validation for hex colors
    if (/^#[0-9A-Fa-f]{0,6}$/.test(newValue)) {
      onChange?.(newValue);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label
          className={cn("block text-sm font-medium", getTextColor("body"))}
        >
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* Color preview */}
        <div
          className={cn(
            "w-8 h-8 rounded border-2 border-gray-300 flex-shrink-0",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          style={{ backgroundColor: value }}
        />

        {/* Hex input */}
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors font-mono text-sm",
            error
              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500",
            disabled && "bg-gray-50 cursor-not-allowed",
            className,
          )}
          aria-invalid={!!error}
          maxLength={7}
          pattern="^#[0-9A-Fa-f]{6}$"
          {...props}
        />

        {/* Native color picker */}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-10 h-10 border border-gray-300 rounded cursor-pointer flex-shrink-0",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          aria-label="Color picker"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {helperText && !error && (
        <p className={cn("text-sm", getTextColor("muted"))}>{helperText}</p>
      )}
    </div>
  );
}

export default ColorInput;
