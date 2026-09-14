import type { TestUserConfig } from "vite-plus";

// xit/xdescribe shims, needed by every project.
const withGlobal = (...extra: string[]) => ["test/global.js", ...extra];

const base = {
  globals: true,
  environment: "jsdom" as const,
  clearMocks: true,
  restoreMocks: true,
  retry: 2,
  testTimeout: 4000,
  setupFiles: withGlobal(),
  server: { deps: { inline: true as const } },
};

export const test: TestUserConfig = {
  setupFiles: withGlobal(),
  // Fastlane's background async throws FASTLANE_SDK_LOAD_ERROR that Vitest flags even when assertions pass.
  dangerouslyIgnoreUnhandledErrors: true,
  coverage: {
    provider: "istanbul",
    include: ["src/**/*.js"],
    exclude: [
      "**/__mocks__/**",
      "src/coverage/**",
      "src/venmo/internal/**",
      "src/lib/frame-service/internal/dispatch-frame.js",
    ],
    reportsDirectory: "src/coverage",
    reporter: [["json", { file: "coverage-final.json" }], "text-summary"],
    thresholds: {},
  },
  projects: [
    ...(
      [
        "american-express",
        "apple-pay",
        "client",
        "fastlane",
        "google-payment",
        "instant-verification",
        "payment-ready",
        "paypal-checkout",
        "paypal-checkout-v6",
        "sepa",
        "us-bank-account",
        "vault-manager",
      ] as const
    ).map((name) => ({
      test: {
        ...base,
        name,
        include: [`test/${name}/unit/**/*.js`],
      },
    })),
    {
      test: {
        ...base,
        name: "data-collector",
        include: ["test/data-collector/unit/**/*.js"],
        environmentOptions: { jsdom: { runScripts: "dangerously" as const } }, // jsdom runScripts required for fraudnet script injection.
      },
    },
    {
      test: {
        ...base,
        name: "hosted-fields",
        include: ["test/hosted-fields/unit/**/*.js"],
        setupFiles: withGlobal("test/hosted-fields/unit/global.js"),
        exclude: ["**/helpers/**/*.js", "**/global.js"],
      },
    },
    {
      test: {
        ...base,
        name: "lib-direct",
        include: ["test/lib/unit/**/*.js"],
        exclude: ["**/global.js"],
        setupFiles: withGlobal("test/lib/unit/global.js"),
      },
    },
    {
      test: {
        ...base,
        name: "three-d-secure",
        include: ["test/three-d-secure/unit/**/*.js"],
        setupFiles: withGlobal("test/three-d-secure/unit/global.js"),
        exclude: ["**/global.js"],
      },
    },
    {
      test: {
        ...base,
        name: "local-payment",
        include: ["test/local-payment/unit/**/*.js"],
        setupFiles: withGlobal("test/local-payment/unit/global.js"),
        exclude: ["**/helpers/**/*.js", "**/global.js"],
      },
    },
    {
      resolve: {
        alias: {
          detectincognitojs: new URL(
            "../../src/lib/__mocks__/detectincognito.js",
            import.meta.url
          ).pathname,
        },
      },
      test: {
        ...base,
        name: "venmo",
        include: ["test/venmo/unit/**/*.js"],
      },
    },
    {
      test: {
        ...base,
        name: "environment",
        include: ["test/environment/**/*.js"],
      },
    },
  ],
};
