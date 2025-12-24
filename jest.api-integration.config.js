/**
 * API Integration Jest Configuration
 *
 * Specialized Jest configuration for API integration tests
 * Runs separately from main test suite to avoid Next.js conflicts
 */

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const apiIntegrationJestConfig = {
  displayName: "API Integration",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@clerk/nextjs/server$": "<rootDir>/__tests__/mocks/clerk-server.js",
    "^@clerk/backend$": "<rootDir>/__tests__/mocks/clerk-backend.js",
  },
  testEnvironment: "node", // Node.js environment for API routes
  testMatch: ["<rootDir>/__tests__/api/**/*.test.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
  ],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  transformIgnorePatterns: ["node_modules/(?!(.*\\.mjs$))"],
  setupFiles: ["<rootDir>/jest.polyfills.js"],
  // Longer timeout for integration tests
  testTimeout: 30000,
  // Verbose output for better debugging
  verbose: true,
  // Collect coverage for API routes
  collectCoverageFrom: [
    "app/api/**/*.{js,jsx,ts,tsx}",
    "!app/api/**/node_modules/**",
    "!**/*.d.ts",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: ".coverage/api-integration",
};

module.exports = createJestConfig(apiIntegrationJestConfig);
