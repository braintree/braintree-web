const REQUIRED_ENV_VARS = [
  "BRAINTREE_JS_API_HOST",
  "BRAINTREE_JS_API_PORT",
  "BRAINTREE_JS_API_PROTOCOL",
  "BRAINTREE_JS_ASSET_URL",
  "BRAINTREE_JS_GRAPH_QL_ENDPOINT",
  "BT_DEV_HOST",
];

const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.warn(
    `[build] Unset env vars (will bake in as empty strings): ${missing.join(", ")}`
  );
}
