import React from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useBlueprintValidation } from "@/lib/hooks/use-blueprint-validation";
import {
  ValidatedInput,
  FormProgress,
} from "@/components/ui/validation-feedback";

type FormSubmitHandler = (e: React.FormEvent) => Promise<void>;

export interface BlueprintCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: FormSubmitHandler;
  credits: number;
}

export const BlueprintCreateModal = React.memo(
  ({ isOpen, onClose, onSubmit, credits }: BlueprintCreateModalProps) => {
    const { formData, resetValidation, getFieldProps, canSubmit, fieldStates } =
      useBlueprintValidation(
        {
          debounceMs: 300,
          enableRealtimeValidation: true,
          enableSuggestions: true,
        },
        {},
      );

    const handleClose = () => {
      onClose();
      resetValidation();
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Create New Blueprint"
        size="lg"
        aria-label="Create new blueprint modal"
      >
        <form onSubmit={onSubmit}>
          <FormProgress
            fieldStates={fieldStates}
            formData={{
              projectName: formData.projectName,
              input: formData.input,
              projectDescription: formData.projectDescription || "",
            }}
            requiredFields={["projectName", "input"]}
          />
          <div className="space-y-6">
            <ValidatedInput
              label="Project Name"
              id="projectName"
              type="text"
              placeholder="Enter project name"
              required
              maxLength={50}
              validationProps={{
                value: getFieldProps("projectName").value || "",
                onChange: getFieldProps("projectName").onChange,
                onBlur: getFieldProps("projectName").onBlur,
                error: getFieldProps("projectName").error,
                warning: getFieldProps("projectName").warning,
                isValid: getFieldProps("projectName").isValid,
                isTouched: getFieldProps("projectName").isTouched,
                isValidating: getFieldProps("projectName").isValidating,
                suggestions: getFieldProps("projectName").suggestions,
              }}
              helperText="Use clear, descriptive naming (3-50 characters)"
            />
            <ValidatedInput
              label="Blueprint Description"
              id="input"
              type="textarea"
              placeholder="Describe blueprint you want to generate (10-1000 characters)"
              required
              maxLength={1000}
              rows={6}
              validationProps={{
                value: getFieldProps("input").value || "",
                onChange: getFieldProps("input").onChange,
                onBlur: getFieldProps("input").onBlur,
                error: getFieldProps("input").error,
                warning: getFieldProps("input").warning,
                isValid: getFieldProps("input").isValid,
                isTouched: getFieldProps("input").isTouched,
                isValidating: getFieldProps("input").isValidating,
                suggestions: getFieldProps("input").suggestions,
              }}
              helperText="Be specific about features, target users, and purpose"
            />
            <div
              className="bg-blue-50 border border-blue-200 rounded-md p-4"
              role="status"
              aria-live="polite"
            >
              <div className="flex">
                <svg
                  className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Real-time Validation Active</p>
                  <p>
                    Creating a blueprint will deduct 1 credit from your account.
                    You currently have {credits} credits available. Your form is
                    validated in real-time to help create better blueprints.
                  </p>
                  {!canSubmit && (
                    <p className="mt-2 text-yellow-700" role="alert">
                      Complete all required fields and fix validation errors to
                      submit.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={credits < 1 || !canSubmit}
              aria-disabled={credits < 1 || !canSubmit}
              aria-describedby={
                credits < 1
                  ? "insufficient-credits"
                  : !canSubmit
                    ? "validation-errors"
                    : undefined
              }
            >
              Create Blueprint (1 Credit)
            </Button>
          </div>
          {credits < 1 && (
            <p id="insufficient-credits" className="sr-only" role="alert">
              You do not have enough credits to create a blueprint. Please
              purchase more credits.
            </p>
          )}
          {!canSubmit && credits >= 1 && (
            <p id="validation-errors" className="sr-only" role="alert">
              Please complete all required fields and fix validation errors to
              submit.
            </p>
          )}
        </form>
      </Modal>
    );
  },
);

BlueprintCreateModal.displayName = "BlueprintCreateModal";
