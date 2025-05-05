// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("node:path");
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 8,
    sourceType: "module",
    ecmaFeatures: {
      impliedStrict: true,
      experimentalObjectRestSpread: true,
    },
    project: path.resolve(__dirname, "tsconfig.json"),
    allowImportExportEverywhere: true,
  },
  plugins: ["@typescript-eslint", "import-x", "react", "eslint-plugin-tsdoc"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:import-x/warnings",
    "plugin:import-x/typescript",
  ],
  rules: {
    curly: "warn",
    "@typescript-eslint/no-base-to-string": "error",
    "@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],
    "no-unused-vars": "off",
    "import-x/no-named-as-default-member": "off",
    "react/display-name": "off",
    "react/jsx-boolean-value": ["warn", "never"],
    "react/jsx-curly-brace-presence": [
      "error",
      { props: "never", children: "ignore" },
    ],
    "react/jsx-wrap-multilines": "error",
    "react/no-array-index-key": "error",
    "react/no-multi-comp": "off",
    "react/prop-types": "off",
    "react/self-closing-comp": "warn",

    "react/jsx-sort-props": [
      "warn",
      {
        shorthandFirst: true,
        callbacksLast: true,
        noSortAlphabetically: true,
      },
    ],
    "import-x/no-cycle": ["warn"],
    "import-x/order": [
      "error",
      {
        groups: ["external", "internal"],
      },
    ],
    "sort-imports": [
      "warn",
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
      },
    ],
    "tsdoc/syntax": "warn",
  },
  settings: {
    "import-x/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx", ".d.ts"],
    },
    "import-x/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: path.resolve(__dirname, "tsconfig.json"),
      },
    },
    react: {
      version: "detect",
    },
  },
  env: {
    es6: true,
    browser: true,
    node: true,
    jest: true,
  },
};
