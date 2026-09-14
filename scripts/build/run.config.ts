export const AUTO_INPUTS = [
  { auto: true as const },
  "!**/*.tsbuildinfo",
  "!dist/**",
];
export const BUILD_ENV = ["BRAINTREE_JS_*", "STORYBOOK_*", "BT_DEV_HOST"];

const PLAYWRIGHT_CACHE_INPUTS = ["src/**", "msw/**", ".storybook/**"];

// Output glob shared by tasks that emit to the versioned `dist/hosted/web/<VERSION>/...`.
// The `*` matches the VERSION segment so the glob survives package.json version bumps.
const DIST_VERSIONED = "dist/hosted/web/*";

export const run = {
  tasks: {
    "test:playwright": {
      command:
        "BRAINTREE_JS_ENV=development playwright test --config=./.storybook/tests/playwright.config.ts",
      env: BUILD_ENV,
      dependsOn: ["cdn:build", "build:storybook"],
      input: PLAYWRIGHT_CACHE_INPUTS,
    },
    "build:components": {
      command: "vp build -c scripts/build/configs/components.ts",
      env: BUILD_ENV,
      input: AUTO_INPUTS,
      // ESM bundles: <name>.mjs + <name>.min.mjs + shared chunks, plus maps.
      output: [`${DIST_VERSIONED}/js/*.mjs`, `${DIST_VERSIONED}/js/*.mjs.map`],
    },
    "build:legacy-components": {
      command: "node scripts/build/build-legacy-components.ts",
      dependsOn: ["build:components"],
      env: BUILD_ENV,
      input: AUTO_INPUTS,
      // IIFE bundles: <name>.js + <name>.min.js. Excludes coverage-mode frame
      // chunks (owned by build:inlined-frames) so the two tasks don't claim
      // the same files in their respective archives.
      output: [
        `${DIST_VERSIONED}/js/*.js`,
        `${DIST_VERSIONED}/js/*.js.map`,
        `!${DIST_VERSIONED}/js/*-frame.js`,
        `!${DIST_VERSIONED}/js/*-internal.js`,
        `!${DIST_VERSIONED}/js/*-frame.js.map`,
        `!${DIST_VERSIONED}/js/*-internal.js.map`,
      ],
    },
    "build:frame-services": {
      command: "node scripts/build/build-frame-services.ts",
      env: BUILD_ENV,
      input: AUTO_INPUTS,
      // dispatch / cancel / redirect frame HTML (and .min variants).
      output: [
        `${DIST_VERSIONED}/html/dispatch-frame.html`,
        `${DIST_VERSIONED}/html/dispatch-frame.min.html`,
        `${DIST_VERSIONED}/html/cancel-frame.html`,
        `${DIST_VERSIONED}/html/cancel-frame.min.html`,
        `${DIST_VERSIONED}/html/redirect-frame.html`,
        `${DIST_VERSIONED}/html/redirect-frame.min.html`,
      ],
    },
    "build:inlined-frames": {
      command: "node scripts/build/build-inlined-frames.ts",
      env: BUILD_ENV,
      input: AUTO_INPUTS,
      // hosted-fields frame, local-payment redirect, venmo desktop (and .min).
      // In coverage builds the JS chunks also land in `js/`; included so cache
      // restores them too when BRAINTREE_JS_COVERAGE_BUILD=true is fingerprinted.
      output: [
        `${DIST_VERSIONED}/html/hosted-fields-frame.html`,
        `${DIST_VERSIONED}/html/hosted-fields-frame.min.html`,
        `${DIST_VERSIONED}/html/local-payment-redirect-frame.html`,
        `${DIST_VERSIONED}/html/local-payment-redirect-frame.min.html`,
        `${DIST_VERSIONED}/html/venmo-desktop-frame.html`,
        `${DIST_VERSIONED}/html/venmo-desktop-frame.min.html`,
        `${DIST_VERSIONED}/js/hosted-fields-internal.js`,
        `${DIST_VERSIONED}/js/local-payment-redirect-frame.js`,
        `${DIST_VERSIONED}/js/venmo-desktop-frame-internal.js`,
      ],
    },
    "build:static-landings": {
      command: "node scripts/build/build-static-landings.ts",
      env: BUILD_ENV,
      input: AUTO_INPUTS,
      // sepa / local-payment / venmo landing HTML (and .min).
      output: [
        `${DIST_VERSIONED}/html/*-landing-frame.html`,
        `${DIST_VERSIONED}/html/*-landing-frame.min.html`,
      ],
    },
    "build:storybook": {
      command: `
       BRAINTREE_JS_ENV=development BRAINTREE_JS_COVERAGE_BUILD=true BRAINTREE_JS_ASSET_URL=/local-build \
       ./scripts/generate-version-list \
       && node .storybook/scripts/copy-local-build.js \
       && mkdir -p ./.storybook/static \
       && rm -rf ./storybook-static \
       && storybook build \
       && .storybook/scripts/generate-test-certs.sh
      `,
      env: BUILD_ENV,
      input: PLAYWRIGHT_CACHE_INPUTS,
      dependsOn: ["npm:build"],
    },
    "npm:build": {
      command: "vp pack",
      env: BUILD_ENV,
      input: AUTO_INPUTS,
      output: ["dist/npm/**"],
    },
    deploy: {
      command: "node scripts/safe-publish.mjs --yes",
      dependsOn: ["npm:build"],
      cache: false,
    },
    // Task names differ from the matching package.json scripts so they don't
    // collide (vp treats script + task names as one namespace). `build:cdn` /
    // `build:npm` / `build:validate` call `cdn:build` / `npm:build` / `vp:validate`.
    "validate:env": {
      command: "node scripts/build/validate-env.ts",
      cache: false,
    },
    "link:dev": {
      command: "tsx scripts/build/link-dev.ts",
      dependsOn: [
        "build:legacy-components",
        "build:frame-services",
        "build:inlined-frames",
        "build:static-landings",
      ],
      cache: false,
    },
    "cdn:build": {
      command: "node -e \"console.log('build:cdn done')\"",
      dependsOn: ["validate:env", "link:dev"],
    },
    "vp:validate": {
      command: "node scripts/build/validate-parity.ts",
      dependsOn: ["cdn:build"],
      env: BUILD_ENV,
      input: AUTO_INPUTS,
    },
  },
};
