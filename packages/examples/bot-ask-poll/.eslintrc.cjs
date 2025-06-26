const path = require("node:path");
module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:import-x/recommended",
    "plugin:import-x/typescript",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: path.resolve(__dirname, "tsconfig.json"),
  },
  plugins: ["@typescript-eslint", "import-x", "eslint-plugin-tsdoc"],
  ignorePatterns: ["dist/**", ".turbo/**", "node_modules/**", "vitest.*"],
  rules: {
    "no-console": "off",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowNever: true,
        allowBoolean: true,
        allowNumber: true,
        allowAny: true,
        allowNullish: true,
      },
    ],
    "@typescript-eslint/no-empty-function": [
      "error",
      {
        allow: ["arrowFunctions"],
      },
    ],
    "@typescript-eslint/ban-ts-comment": "off",
    "tsdoc/syntax": "warn",
  },
  overrides: [
    {
      files: ["**/*.test.*", "**/*.test_util.*"],
      rules: {
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "tsdoc/syntax": "off",
      },
    },
  ],
};
