import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}

/**
 * FormField component provides consistent form field layout with accessible labels and error states
 *
 * Features:
 * - Semantic association between label and input
 * - Visual error states with ARIA attributes
 * - Helper text for additional guidance
 * - Required field indicators
 * - Accessible for screen readers
 *
 * Usage:
 * ```tsx
 * <FormField label="Email" error={errors.email} required htmlFor="email" helperText="We'll never share your email">
 *   <input id="email" type="email" aria-invalid={!!errors.email} aria-describedby="email-error" />
 * </FormField>
 * ```
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      error,
      helperText,
      required = false,
      htmlFor,
      children,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const fieldId = htmlFor || id;
    const errorId = error ? `${fieldId}-error` : undefined;
    const helperId = helperText ? `${fieldId}-helper` : undefined;

    const isInvalid = Boolean(error);

    return (
      <div ref={ref} className={cn("space-y-2", className)} id={id} {...props}>
        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              "block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              isInvalid ? "text-destructive" : "text-foreground",
            )}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          "aria-invalid": isInvalid,
          "aria-describedby": cn(errorId, helperId),
          "aria-required": required,
        })}

        {error && (
          <p
            id={errorId}
            className={cn("text-sm", "text-destructive")}
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className={cn("text-sm", "text-muted-foreground")}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input",
          "bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2",
          "focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";

export { Input, Textarea, Select };
