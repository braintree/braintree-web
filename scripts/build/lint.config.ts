import type { OxlintConfig } from "oxlint";

type RuleMap = NonNullable<
  NonNullable<OxlintConfig["overrides"]>[number]["rules"]
>;

const BASE_RULES: RuleMap = {
  "accessor-pairs": "error",
  "block-scoped-var": "error",
  complexity: ["warn", { max: 15 }],
  "default-case": "error",
  "default-case-last": "error",
  // `smart` is the closest Oxlint equivalent to ESLint's `allow-null`.
  eqeqeq: ["error", "smart"],
  "guard-for-in": "error",
  "max-depth": ["warn", 4],
  "no-alert": "error",
  "no-caller": "error",
  "no-div-regex": "error",
  "no-else-return": ["error", { allowElseIf: false }],
  "no-empty-pattern": "error",
  "no-eq-null": "off",
  "no-eval": "error",
  "no-extend-native": "error",
  "no-extra-bind": "error",
  "no-extra-label": "error",
  "no-fallthrough": "error",
  "no-implicit-coercion": [
    "error",
    { string: true, number: true, boolean: true },
  ],
  "no-implied-eval": "error",
  "no-iterator": "error",
  "no-labels": "error",
  "no-lone-blocks": "error",
  "no-loop-func": "error",
  "no-multi-str": "error",
  "no-new-func": "error",
  "no-new-wrappers": "error",
  "no-proto": "error",
  "no-return-assign": "error",
  "no-script-url": "error",
  "no-self-assign": "error",
  "no-self-compare": "error",
  "no-sequences": "error",
  "no-throw-literal": "error",
  "no-unmodified-loop-condition": "error",
  "no-unused-expressions": [
    "error",
    { allowShortCircuit: true, allowTernary: true },
  ],
  "no-useless-call": "error",
  "no-useless-concat": "error",
  "no-useless-return": "error",
  "no-void": "error",
  "no-warning-comments": [
    "error",
    { terms: ["todo", "fixme"], location: "anywhere" },
  ],
  "no-with": "error",
  radix: "error",
  "require-await": "error",
  yoda: ["error", "never"],

  "for-direction": "error",
  "getter-return": "error",
  "no-async-promise-executor": "error",
  "no-cond-assign": ["error", "always"],
  "no-constant-condition": "error",
  "no-control-regex": "error",
  "no-debugger": "warn",
  "no-dupe-else-if": "error",
  "no-dupe-keys": "error",
  "no-duplicate-case": "error",
  "no-empty": "error",
  "no-empty-character-class": "error",
  "no-ex-assign": "error",
  "no-extra-boolean-cast": "error",
  "no-func-assign": "error",
  "no-import-assign": "error",
  "no-inner-declarations": ["error", "both"],
  "no-invalid-regexp": "error",
  "no-irregular-whitespace": "error",
  "no-misleading-character-class": "error",
  "no-obj-calls": "error",
  "no-promise-executor-return": "error",
  "no-regex-spaces": "error",
  "no-setter-return": "error",
  "no-sparse-arrays": "error",
  "no-template-curly-in-string": "error",
  "no-unreachable": "error",
  "no-unsafe-finally": "error",
  "no-unsafe-negation": ["error", { enforceForOrderingRelations: true }],
  "no-useless-backreference": "error",
  "use-isnan": "error",
  "valid-typeof": ["error", { requireStringLiterals: true }],

  "no-delete-var": "error",
  "no-label-var": "error",
  "no-restricted-globals": ["error", "event", "fdescribe"],
  "no-shadow-restricted-names": "error",
  "no-unused-vars": [
    "error",
    {
      vars: "all",
      args: "after-used",
      ignoreRestSiblings: true,
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
    },
  ],
};

// Tests inherit BASE_RULES except these. Each fires on legitimate test
// patterns, not real bugs (jest mock idioms, fixture data, async test
// fns that don't always await).
const TEST_RULES_OFF: RuleMap = {
  "no-promise-executor-return": "off",
  "no-unused-vars": "off",
  "require-await": "off",
  "no-inner-declarations": "off",
  "no-script-url": "off",
  "no-new-wrappers": "off",
};

export const lint: OxlintConfig = {
  plugins: ["eslint", "typescript", "jest", "promise", "jsdoc"],
  options: { typeAware: false, typeCheck: false },
  categories: { correctness: "off" },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "vendor/",
    "storybook-static/",
    ".storybook/static/",
    "src/venmo/shared/events.js",
    "src/venmo/shared/types.js",
    "src/venmo/internal",
    "src/venmo/external",
    "**/coverage/",
    "test-results",
    "playwright-report",
    ".remember/",
    "generated/",
    "**/*.tsbuildinfo",
  ],
  rules: {
    "promise/no-return-wrap": "error",
  },
  overrides: [
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      rules: BASE_RULES,
    },
    {
      files: ["src/**/*.js"],
      rules: {
        "no-console": "error",
      },
    },
    {
      files: ["src/**/*.js", "__mocks__/**/*.js"],
      rules: {
        "jsdoc/require-returns": "error",
        "jsdoc/require-param-description": "error",
        "jsdoc/require-returns-description": "error",
      },
    },
    {
      files: [
        "test/**",
        "**/__tests__/**/*.{js,ts}",
        "**/*.test.{js,ts}",
        "**/*.spec.{js,ts}",
      ],
      rules: TEST_RULES_OFF,
    },
  ],
};
