import path from "node:path";
import { defineConfig } from "vite-plus";
import { baseConfig, DIST_JS } from "./base.ts";
import { ROOT } from "../vite/configs/shared.ts";

const isCoverage = process.env.BRAINTREE_JS_COVERAGE_BUILD === "true";

const entry = (name: string): string =>
  path.resolve(ROOT, `src/${name}/index.js`);

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    sourcemap: isCoverage ? ("inline" as const) : true,
    lib: {
      entry: {
        "american-express": entry("american-express"),
        "apple-pay": entry("apple-pay"),
        client: entry("client"),
        "data-collector": entry("data-collector"),
        fastlane: entry("fastlane"),
        "google-payment": entry("google-payment"),
        "hosted-fields": entry("hosted-fields"),
        "instant-verification": entry("instant-verification"),
        "local-payment": entry("local-payment"),
        "payment-ready": entry("payment-ready"),
        "paypal-checkout": entry("paypal-checkout"),
        "paypal-checkout-v6": entry("paypal-checkout-v6"),
        sepa: entry("sepa"),
        "three-d-secure": entry("three-d-secure"),
        "us-bank-account": entry("us-bank-account"),
        "vault-manager": entry("vault-manager"),
        venmo: entry("venmo"),
      },
    },
    rolldownOptions: {
      output: [
        {
          format: "es" as const,
          entryFileNames: "[name].mjs",
          dir: DIST_JS,
          exports: "default" as const,
          minify: false,
        },
        {
          format: "es" as const,
          entryFileNames: "[name].min.mjs",
          dir: DIST_JS,
          exports: "default" as const,
          minify: true,
        },
      ],
    },
  },
});
