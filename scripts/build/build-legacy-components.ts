import path from "node:path";
import { build } from "vite-plus";
import { DEFINE_VALUES, ROOT, TARGET } from "./vite/configs/shared.ts";
import { DIST_JS } from "./configs/base.ts";

const isCoverage = process.env.BRAINTREE_JS_COVERAGE_BUILD === "true";

const generateLegacyBuild = (name: string, globalName: string) =>
  build({
    root: ROOT,
    logLevel: "warn",
    define: DEFINE_VALUES,
    build: {
      target: TARGET,
      emptyOutDir: false,
      sourcemap: isCoverage ? ("inline" as const) : true,
      lib: {
        entry: path.resolve(ROOT, `src/${name}/index.js`),
        name: globalName,
      },
      rolldownOptions: {
        output: [
          {
            format: "iife" as const,
            dir: DIST_JS,
            entryFileNames: `${name}.js`,
            exports: "default" as const,
            minify: false,
            name: globalName,
          },
          {
            format: "iife" as const,
            dir: DIST_JS,
            entryFileNames: `${name}.min.js`,
            exports: "default" as const,
            minify: true,
            name: globalName,
          },
        ],
      },
    },
  });

await Promise.all([
  generateLegacyBuild("american-express", "braintree.americanExpress"),
  generateLegacyBuild("apple-pay", "braintree.applePay"),
  generateLegacyBuild("client", "braintree.client"),
  generateLegacyBuild("data-collector", "braintree.dataCollector"),
  generateLegacyBuild("fastlane", "braintree.fastlane"),
  generateLegacyBuild("google-payment", "braintree.googlePayment"),
  generateLegacyBuild("hosted-fields", "braintree.hostedFields"),
  generateLegacyBuild("instant-verification", "braintree.instantVerification"),
  generateLegacyBuild("local-payment", "braintree.localPayment"),
  generateLegacyBuild("payment-ready", "braintree.paymentReady"),
  generateLegacyBuild("paypal-checkout", "braintree.paypalCheckout"),
  generateLegacyBuild("paypal-checkout-v6", "braintree.paypalCheckoutV6"),
  generateLegacyBuild("sepa", "braintree.sepa"),
  generateLegacyBuild("three-d-secure", "braintree.threeDSecure"),
  generateLegacyBuild("us-bank-account", "braintree.usBankAccount"),
  generateLegacyBuild("vault-manager", "braintree.vaultManager"),
  generateLegacyBuild("venmo", "braintree.venmo"),
]);
