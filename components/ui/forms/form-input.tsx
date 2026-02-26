import React, { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn, getTextColor } from "@/lib/constants/ui-themes";
import { generateFormId } from "@/lib/services/form-service";

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

/**
 * Atomic form input component following LEGO principles
 * Replaces 15+ instances of duplicate form styling across components
 */
export function FormInput({
  label,
  error,
  helperText,
  required,
  className,
  id,
  ...props
}: FormInputProps) {
  const hasError = !!error;
  const inputId = id || generateFormId("input");

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm font-medium",
            error ? "text-red-700" : getTextColor("body"),
            required && "after:content-['*'] after:ml-1 after:text-red-500",
          )}
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={cn(
          "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors duration-200 hover:border-gray-400",
          error
            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500",
          props.disabled && "bg-gray-50 cursor-not-allowed",
          className,
        )}
        aria-invalid={hasError}
        aria-describedby={
          error
            ? `${inputId}-error`
            : helperText
              ? `${inputId}-helper`
              : undefined
        }
        {...props}
      />

      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p
          id={`${inputId}-helper`}
          className={cn("text-sm", getTextColor("muted"))}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Atomic textarea component following LEGO principles
 */
export function FormTextarea({
  label,
  error,
  helperText,
  required,
  className,
  id,
  ...props
}: FormTextareaProps) {
  const hasError = !!error;
  const inputId = id || generateFormId("textarea");

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm font-medium",
            error ? "text-red-700" : getTextColor("body"),
            required && "after:content-['*'] after:ml-1 after:text-red-500",
          )}
        >
          {label}
        </label>
      )}

      <textarea
        id={inputId}
        className={cn(
          "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors duration-200 hover:border-gray-400 resize-vertical",
          error
            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500",
          props.disabled && "bg-gray-50 cursor-not-allowed",
          className,
        )}
        aria-invalid={hasError}
        aria-describedby={
          error
            ? `${inputId}-error`
            : helperText
              ? `${inputId}-helper`
              : undefined
        }
        {...props}
      />

      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p
          id={`${inputId}-helper`}
          className={cn("text-sm", getTextColor("muted"))}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

export default FormInput;
