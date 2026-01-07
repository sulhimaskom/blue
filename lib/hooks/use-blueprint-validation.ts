import { useState, useCallback, useEffect } from "react";
import { debounce } from "lodash";
import {
  blueprintValidationService,
  type BlueprintFormData,
  type ValidationResult,
  type RealtimeValidationResponse,
} from "@/lib/services/blueprint-validation-service";

interface UseBlueprintValidationOptions {
  debounceMs?: number;
  enableRealtimeValidation?: boolean;
  enableSuggestions?: boolean;
}

interface FieldValidationState {
  isValid: boolean;
  isTouched: boolean;
  isValidating: boolean;
  error?: string;
  warning?: string;
  suggestions: string[];
}

interface ValidationState {
  project: Record<keyof BlueprintFormData, FieldValidationState>;
  form: {
    isValid: boolean;
    isSubmitting: boolean;
    generalError?: string;
  };
}

export function useBlueprintValidation(
  options: UseBlueprintValidationOptions = {},
  initialData: Partial<BlueprintFormData> = {},
) {
  const {
    debounceMs = 300,
    enableRealtimeValidation = true,
    enableSuggestions = true,
  } = options;

  const [formData, setFormData] = useState<BlueprintFormData>({
    projectName: initialData.projectName || "",
    input: initialData.input || "",
    projectDescription: initialData.projectDescription || "",
  });

  const [validationState, setValidationState] = useState<ValidationState>({
    project: {
      projectName: {
        isValid: false,
        isTouched: false,
        isValidating: false,
        suggestions: [],
      },
      input: {
        isValid: false,
        isTouched: false,
        isValidating: false,
        suggestions: [],
      },
      projectDescription: {
        isValid: true,
        isTouched: false,
        isValidating: false,
        suggestions: [],
      },
    },
    form: {
      isValid: false,
      isSubmitting: false,
    },
  });

  // Debounced field validation function
  const debouncedFieldValidation = useCallback(
    debounce(async (field: keyof BlueprintFormData, value: string) => {
      if (!enableRealtimeValidation) return;

      setValidationState((prev) => ({
        ...prev,
        project: {
          ...prev.project,
          [field]: {
            ...prev.project[field],
            isValidating: true,
          },
        },
      }));

      try {
        const result: RealtimeValidationResponse =
          await blueprintValidationService.validateField(
            field,
            value,
            formData,
          );

        setValidationState((prev) => ({
          ...prev,
          project: {
            ...prev.project,
            [field]: {
              isValid: result.result.isValid,
              isTouched: true,
              isValidating: false,
              error: result.result.isValid ? undefined : result.result.message,
              warning: result.result.warning,
              suggestions: enableSuggestions
                ? result.result.suggestions || []
                : [],
            },
          },
        }));
      } catch (error) {
        setValidationState((prev) => ({
          ...prev,
          project: {
            ...prev.project,
            [field]: {
              ...prev.project[field],
              isValidating: false,
              error: "Validation failed",
            },
          },
        }));
      }
    }, debounceMs),
    [
      formData,
      debounceMs,
      enableRealtimeValidation,
      enableSuggestions,
      setValidationState,
    ],
  );

  // Handle field value change
  const updateField = useCallback(
    (field: keyof BlueprintFormData, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Mark field as touched immediately
      setValidationState((prev) => ({
        ...prev,
        project: {
          ...prev.project,
          [field]: {
            ...prev.project[field],
            isTouched: true,
          },
        },
      }));

      // Trigger debounced validation
      debouncedFieldValidation(field, value);
    },
    [debouncedFieldValidation],
  );

  // Validate entire form
  const validateForm = useCallback(async (): Promise<ValidationResult> => {
    setValidationState((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        isSubmitting: true,
        generalError: undefined,
      },
    }));

    try {
      const result = await blueprintValidationService.validateForm(formData);

      // Update all field states based on comprehensive validation
      const updatedProjectState = { ...validationState.project };

      Object.keys(formData).forEach((field) => {
        const fieldName = field as keyof BlueprintFormData;
        updatedProjectState[fieldName] = {
          ...updatedProjectState[fieldName],
          isValid: !result.errors[fieldName],
          error: result.errors[fieldName],
          warning: result.warnings[fieldName],
          suggestions: enableSuggestions
            ? result.suggestions[fieldName] || []
            : [],
          isTouched: true,
          isValidating: false,
        };
      });

      setValidationState((prev) => ({
        ...prev,
        project: updatedProjectState,
        form: {
          isValid: result.isValid,
          isSubmitting: false,
          generalError: result.errors.form,
        },
      }));

      return result;
    } catch (error) {
      setValidationState((prev) => ({
        ...prev,
        form: {
          ...prev.form,
          isSubmitting: false,
          generalError:
            error instanceof Error ? error.message : "Validation failed",
        },
      }));

      throw error;
    }
  }, [formData, validationState.project, enableSuggestions]);

  // Reset validation state
  const resetValidation = useCallback(() => {
    setValidationState({
      project: {
        projectName: {
          isValid: false,
          isTouched: false,
          isValidating: false,
          suggestions: [],
        },
        input: {
          isValid: false,
          isTouched: false,
          isValidating: false,
          suggestions: [],
        },
        projectDescription: {
          isValid: true,
          isTouched: false,
          isValidating: false,
          suggestions: [],
        },
      },
      form: {
        isValid: false,
        isSubmitting: false,
      },
    });
  }, []);

  // Get field validation props for form inputs
  const getFieldProps = useCallback(
    (field: keyof BlueprintFormData) => {
      const fieldState = validationState.project[field];

      return {
        value: formData[field],
        onChange: (value: string) => updateField(field, value),
        onBlur: () => {
          if (!fieldState.isTouched) {
            setValidationState((prev) => ({
              ...prev,
              project: {
                ...prev.project,
                [field]: {
                  ...prev.project[field],
                  isTouched: true,
                },
              },
            }));
          }
        },
        error: fieldState.isTouched ? fieldState.error : undefined,
        warning: fieldState.isTouched ? fieldState.warning : undefined,
        isValid: fieldState.isValid,
        isTouched: fieldState.isTouched,
        isValidating: fieldState.isValidating,
        suggestions: fieldState.suggestions,
      };
    },
    [formData, validationState.project, updateField],
  );

  // Check if form is ready for submission
  const canSubmit =
    validationState.form.isValid &&
    !validationState.form.isSubmitting &&
    Object.values(validationState.project).every(
      (field) => field.isValid && !field.isValidating,
    );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedFieldValidation.cancel();
    };
  }, [debouncedFieldValidation]);

  return {
    // Form data
    formData,
    setFormData,

    // Validation state
    validationState,
    canSubmit,

    // Methods
    updateField,
    validateForm,
    resetValidation,
    getFieldProps,

    // Individual field states
    fieldStates: validationState.project,
    formState: validationState.form,
  };
}

export type {
  UseBlueprintValidationOptions,
  FieldValidationState,
  ValidationState,
};
