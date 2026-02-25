import React, { SelectHTMLAttributes } from "react";
import { cn, getTextColor } from "@/lib/constants/ui-themes";
import { generateFormId } from "@/lib/services/form-service";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "options"
> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  required?: boolean;
  emptyText?: string;
}

/**
 * Atomic select component following LEGO principles
 * Replaces duplicate select styling patterns across components
 */
export function FormSelect({
  label,
  options,
  error,
  helperText,
  required,
  emptyText = "Select an option...",
  className,
  id,
  ...props
}: FormSelectProps) {
  const hasError = !!error;
  const selectId = id || generateFormId("select");

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            "block text-sm font-medium",
            error ? "text-red-700" : getTextColor("body"),
            required && "after:content-['*'] after:ml-1 after:text-red-500",
          )}
        >
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={cn(
          "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors bg-white hover:border-gray-400 duration-200",
          error
            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500",
          props.disabled && "bg-gray-50 cursor-not-allowed",
          className,
        )}
        aria-invalid={hasError}
        aria-describedby={
          error
            ? `${selectId}-error`
            : helperText
              ? `${selectId}-helper`
              : undefined
        }
        {...props}
      >
        {!props.multiple && (
          <option value="" disabled={required}>
            {emptyText}
          </option>
        )}

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={`${selectId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p
          id={`${selectId}-helper`}
          className={cn("text-sm", getTextColor("muted"))}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

export default FormSelect;
