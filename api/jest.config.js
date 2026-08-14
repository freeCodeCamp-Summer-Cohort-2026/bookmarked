/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 30000,
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/src/__tests__/setup.ts",
  ],
  globalSetup: "<rootDir>/jest.global-setup.js",
  globalTeardown: "<rootDir>/jest.global-teardown.js",
};
