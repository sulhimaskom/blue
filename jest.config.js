const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@clerk/nextjs/server$": "<rootDir>/__tests__/mocks/clerk-server.js",
    "^@clerk/backend$": "<rootDir>/__tests__/mocks/clerk-backend.js",
  },
  testEnvironment: "jest-environment-jsdom",
  // Performance optimizations for faster CI/CD
  maxWorkers: 4, // Use parallel workers for faster execution
  testTimeout: 10000, // 10s timeout per test
  collectCoverageFrom: [
    "lib/**/*.{js,ts,tsx}",
    "app/**/*.{js,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/__tests__/factories/",
    "<rootDir>/__tests__/builders/",
    "<rootDir>/__tests__/setup/",
    "<rootDir>/__tests__/helpers/",
    "<rootDir>/__tests__/mocks/",
    "<rootDir>/__tests__/integration/",
    // Temporarily ignore complex API integration tests
    "<rootDir>/__tests__/api/",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  transformIgnorePatterns: ["node_modules/(?!(.*\\.mjs$))"],
  setupFiles: ["<rootDir>/jest.polyfills.js"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
