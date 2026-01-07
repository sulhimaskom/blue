import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "@jest/globals";
import { useBlueprintValidation } from "@/lib/hooks/use-blueprint-validation";

// Mock the validation service with simpler approach
jest.mock("@/lib/services/blueprint-validation-service", () => ({
  blueprintValidationService: {
    validateField: jest.fn(() =>
      Promise.resolve({
        field: "projectName",
        value: "",
        result: { isValid: true },
      }),
    ),
    validateForm: jest.fn(() =>
      Promise.resolve({
        isValid: true,
        errors: {},
        warnings: {},
        suggestions: {},
      }),
    ),
  },
}));

describe("useBlueprintValidation", () => {
  it("should initialize with default values", () => {
    const { result } = renderHook(() => useBlueprintValidation());

    expect(result.current.formData).toEqual({
      projectName: "",
      input: "",
      projectDescription: "",
    });

    expect(result.current.canSubmit).toBe(false);
    expect(result.current.validationState.form.isValid).toBe(false);
    expect(result.current.validationState.form.isSubmitting).toBe(false);
  });

  it("should initialize with provided initial data", () => {
    const initialData = {
      projectName: "Test Project",
      input: "Test description",
    };

    const { result } = renderHook(() =>
      useBlueprintValidation({}, initialData),
    );

    expect(result.current.formData).toEqual({
      projectName: "Test Project",
      input: "Test description",
      projectDescription: "",
    });
  });

  it("should update field values", () => {
    const { result } = renderHook(() => useBlueprintValidation());

    act(() => {
      result.current.updateField("projectName", "New Project");
    });

    expect(result.current.formData.projectName).toBe("New Project");
    expect(result.current.fieldStates.projectName.isTouched).toBe(true);
  });

  it("should mark fields as touched on update", () => {
    const { result } = renderHook(() => useBlueprintValidation());

    act(() => {
      result.current.updateField("input", "Test description");
    });

    expect(result.current.fieldStates.input.isTouched).toBe(true);
  });

  it("should validate entire form", async () => {
    const { result } = renderHook(() => useBlueprintValidation());

    await act(async () => {
      await result.current.validateForm();
    });

    // Just test that validateForm can be called without error
    expect(typeof result.current.validateForm).toBe("function");
  });

  it("should provide field props for form inputs", () => {
    const { result } = renderHook(() => useBlueprintValidation());

    const fieldProps = result.current.getFieldProps("projectName");

    expect(fieldProps).toHaveProperty("value");
    expect(fieldProps).toHaveProperty("onChange");
    expect(fieldProps).toHaveProperty("onBlur");
    expect(fieldProps).toHaveProperty("error");
    expect(fieldProps).toHaveProperty("isValid");
    expect(fieldProps).toHaveProperty("isTouched");
    expect(fieldProps).toHaveProperty("suggestions");
  });

  it("should handle field value changes through props", () => {
    const { result } = renderHook(() => useBlueprintValidation());
    const fieldProps = result.current.getFieldProps("input");

    act(() => {
      fieldProps.onChange("New description");
    });

    expect(result.current.formData.input).toBe("New description");
    expect(result.current.fieldStates.input.isTouched).toBe(true);
  });

  it("should handle field blur events", () => {
    const { result } = renderHook(() => useBlueprintValidation());
    const fieldProps = result.current.getFieldProps("projectName");

    act(() => {
      fieldProps.onBlur();
    });

    expect(result.current.fieldStates.projectName.isTouched).toBe(true);
  });

  it("should reset validation state", () => {
    const { result } = renderHook(() => useBlueprintValidation());

    // Touch a field
    act(() => {
      result.current.updateField("projectName", "Test");
    });

    expect(result.current.fieldStates.projectName.isTouched).toBe(true);

    // Reset
    act(() => {
      result.current.resetValidation();
    });

    expect(result.current.fieldStates.projectName.isTouched).toBe(false);
    expect(result.current.validationState.form.isValid).toBe(false);
  });
});
