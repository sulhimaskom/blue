import React from "react";
import { cn, getStatusTheme, getTextColor } from "@/lib/constants/ui-themes";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  LightbulbIcon,
  Loader2Icon,
} from "./icons";

interface ValidationFeedbackProps {
  isValid: boolean;
  isTouched: boolean;
  isValidating: boolean;
  error?: string;
  warning?: string;
  suggestions?: string[];
  showSuggestions?: boolean;
}

export function ValidationFeedback({
  isValid,
  isTouched,
  isValidating,
  error,
  warning,
  suggestions = [],
  showSuggestions = true,
}: ValidationFeedbackProps) {
  // Don't show anything if not touched and not validating
  if (!isTouched && !isValidating) {
    return null;
  }

  // Show loading state
  if (isValidating) {
    return (
      <div
        className={cn(
          "flex items-center space-x-2 text-sm mt-1",
          getTextColor("muted"),
        )}
      >
        <Loader2Icon className="w-4 h-4" />
        <span>Validating...</span>
      </div>
    );
  }

  // Don't show feedback if not touched
  if (!isTouched) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Error state */}
      {error && (
        <div
          className={cn(
            "flex items-start space-x-2 text-sm",
            getStatusTheme("unhealthy").split(" ")[0],
          )}
        >
          <AlertCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Warning state */}
      {warning && !error && (
        <div className="flex items-start space-x-2 text-yellow-600 text-sm">
          <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Success state */}
      {isValid && !error && !warning && isTouched && (
        <div className="flex items-center space-x-2 text-green-600 text-sm">
          <CheckCircleIcon className="w-4 h-4" />
          <span>Looks good!</span>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && !error && (
        <div className="rounded-md bg-blue-50 p-3">
          <div className="flex items-start space-x-2">
            <LightbulbIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Suggestions</p>
              <ul className="mt-1 text-sm text-blue-700 space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ValidatedInputProps {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
  className?: string;
  validationProps: {
    value: string;
    // eslint-disable-next-line no-unused-vars
    onChange: (value: string) => void;
    onBlur: () => void;
    error?: string;
    warning?: string;
    isValid: boolean;
    isTouched: boolean;
    isValidating: boolean;
    suggestions: string[];
  };
  showSuggestions?: boolean;
  helperText?: string;
}

export function ValidatedInput({
  label,
  id,
  type = "text",
  placeholder,
  required = false,
  maxLength,
  rows,
  disabled = false,
  className,
  validationProps,
  showSuggestions = true,
  helperText,
}: ValidatedInputProps) {
  const {
    value,
    onChange,
    onBlur,
    error,
    warning,
    isValid,
    isTouched,
    isValidating,
    suggestions,
  } = validationProps;

  const hasError = isTouched && !!error;
  const hasWarning = isTouched && !!warning && !error;

  const inputClasses = cn(
    "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors",
    {
      "border-red-300 focus:ring-red-500 focus:border-red-500": hasError,
      "border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500":
        hasWarning,
      "border-gray-300 focus:ring-blue-500 focus:border-blue-500":
        !hasError && !hasWarning,
      "bg-gray-50 cursor-not-allowed": disabled,
    },
    className,
  );

  const labelClasses = cn("block text-sm font-medium mb-2", {
    "text-red-700": hasError,
    "text-yellow-700": hasWarning,
    "text-gray-700": !hasError && !hasWarning,
  });

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={labelClasses}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {type === "textarea" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          disabled={disabled}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}

      {/* Character count */}
      {maxLength && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{helperText}</span>
          <span
            className={cn({
              "text-red-500": value.length >= maxLength * 0.95,
              "text-gray-500": value.length < maxLength * 0.95,
            })}
          >
            {value.length}/{maxLength}
          </span>
        </div>
      )}

      {/* Validation feedback */}
      <ValidationFeedback
        isValid={isValid}
        isTouched={isTouched}
        isValidating={isValidating}
        error={error}
        warning={warning}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
      />
    </div>
  );
}

interface FormProgressProps {
  fieldStates: Record<
    string,
    {
      isValid: boolean;
      isTouched: boolean;
      isValidating: boolean;
    }
  >;
  formData: Record<string, string>;
  requiredFields: string[];
}

export function FormProgress({
  fieldStates,
  formData,
  requiredFields,
}: FormProgressProps) {
  const completedFields = requiredFields.filter(
    (field) =>
      fieldStates[field]?.isValid && formData[field]?.trim().length > 0,
  ).length;

  const progressPercentage = (completedFields / requiredFields.length) * 100;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Form Completion</h3>
        <span className="text-sm text-gray-500">
          {completedFields} of {requiredFields.length} completed
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-300 ease-out",
            {
              "bg-red-500": progressPercentage < 33,
              "bg-yellow-500":
                progressPercentage >= 33 && progressPercentage < 66,
              "bg-green-500": progressPercentage >= 66,
            },
          )}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
