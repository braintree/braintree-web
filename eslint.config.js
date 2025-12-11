const eslintBraintreeClientConfig = require("eslint-config-braintree/client");
const eslintJestConfig = require("eslint-config-braintree/jest");
const jsdoc = require("eslint-plugin-jsdoc");

module.exports = [
  {
    ignores: [
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
    ],
  },
  ...eslintBraintreeClientConfig.default,
  {
    files: ["src/**/*.js"],
    rules: {
      camelcase: "error",
    },
  },
  {
    files: ["src/**/*.js", "__mocks__/**/*.js"],
    plugins: {
      jsdoc,
    },
    rules: {
      // Turning this rule off because otherwise it will create JSDoc blocks for _every_ function
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-returns": "error",
      "jsdoc/require-param-description": "error",
      "jsdoc/require-returns-description": "error",
    },
  },
  ...eslintJestConfig.default,
  {
    files: [".storybook/**/*.ts"],
    languageOptions: {
      globals: {
        browser: "readonly",
        driver: "readonly",
        $: "readonly",
        $$: "readonly",
        process: "readonly",
        ApplePaySession: "readonly",
      },
    },
  },
];
