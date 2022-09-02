module.exports = {
  env: {
    node: true,
  },
  extends: ["@harmony/eslint-config", "plugin:node/recommended"],
  parserOptions: {
    ecmaVersion: 2020,
    project: ["./tsconfig.json"],
    sourceType: "module",
  },
  rules: {
    "node/no-unsupported-features/es-syntax": [
      "error",
      { ignores: ["modules"] },
    ],
  },
};
