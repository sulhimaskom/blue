import React, { ReactNode } from "react";
import { cn } from "@/lib/constants/ui-themes";

export interface FieldGroupProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  variant?: "default" | "compact" | "spaced";
}

/**
 * Atomic field group component for organizing form fields
 * Consolidates repeated field layout patterns across forms
 */
export function FieldGroup({
  children,
  title,
  description,
  className,
  variant = "default",
}: FieldGroupProps) {
  const variantClasses = {
    default: "space-y-4",
    compact: "space-y-3",
    spaced: "space-y-6",
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3
              className={cn(
                "text-lg font-medium",
                title ? "text-gray-900" : "",
              )}
            >
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-4">{children}</div>
    </div>
  );
}

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable form section with consistent styling
 * Replaces duplicate section patterns across application forms
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "bg-white p-6 rounded-lg border border-gray-200",
        className,
      )}
    >
      <div className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </header>

        <div className="space-y-4">{children}</div>
      </div>
    </section>
  );
}

export default FieldGroup;
