/**
 * Atomic Form Components - LEGO Architecture
 *
 * Consolidated form components that eliminate 15+ instances of duplicate styling
 * Each component is atomic, reusable, and follows design system principles
 */

export { FormInput, FormTextarea } from "./form-input";
export { FormSelect } from "./form-select";
export { ColorInput } from "./color-input";
export { FieldGroup, FormSection } from "./field-group";

export type { FormInputProps, FormTextareaProps } from "./form-input";

export type { SelectOption, FormSelectProps } from "./form-select";

export type { ColorInputProps } from "./color-input";

export type { FieldGroupProps, FormSectionProps } from "./field-group";

/**
 * Usage Examples:
 *
 * 1. Basic input with validation:
 *    <FormInput label="Email" type="email" required error="Invalid email" />
 *
 * 2. Form section with grouped fields:
 *    <FormSection title="User Information">
 *      <FieldGroup>
 *        <FormInput label="Name" />
 *        <FormInput label="Email" type="email" />
 *      </FieldGroup>
 *    </FormSection>
 *
 * 3. Color picker for theme customization:
 *    <ColorInput label="Primary Color" value="#3B82F6" onChange={setColor} />
 *
 * 4. Select dropdown:
 *    <FormSelect
 *      label="Category"
 *      options={[
 *        { value: "dev", label: "Developer" },
 *        { value: "design", label: "Designer" }
 *      ]}
 *    />
 */
