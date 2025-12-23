/// <reference types="@types/jest" />
import "@testing-library/jest-dom";

// Import polyfills for Web APIs
require("./jest.polyfills");

// Import centralized test setup
import { setupEnvironmentMocks } from "./__tests__/setup/environment-mocks";
import { setupAuthMocks } from "./__tests__/setup/auth-setup";

// Setup global test environment
beforeAll(() => {
  // Setup environment variables once
  setupEnvironmentMocks();

  // The test environment is set by jest configuration
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Setup default authenticated user
  setupAuthMocks();
});

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
