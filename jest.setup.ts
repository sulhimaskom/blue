/// <reference types="@types/jest" />
import "@testing-library/jest-dom";

// Import polyfills for Web APIs
require("./jest.polyfills");

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeEmpty(): R;
      toHaveStyle(style: Record<string, string>): R;
    }
  }
}
