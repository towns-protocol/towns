import type { Config } from "@jest/types";
// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  preset: "ts-jest",
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
  testEnvironment: "jsdom",
  testEnvironmentOptions: { browsers: ["chrome", "firefox", "safari"] },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.test.json", // the tests are failing with a react error otherwise, see https://stackoverflow.com/questions/70721310/react-is-undefind-in-jest-tests
    },
  },
};
export default config;
