import path from "node:path";
import packageJson from "../../../../package.json" with { type: "json" };

export const VERSION = packageJson.version;
export const ROOT = path.resolve(import.meta.dirname, "../../../..");
export const DIST_DIRECTORY = path.resolve(ROOT, "dist/hosted/web", VERSION);
export const NPM_DIST_DIRECTORY = path.resolve(ROOT, "dist/npm");
export const TARGET = "es2017" as const;

export const FRAMES = ["dispatch", "cancel", "redirect"] as const;

export const DEFINE_VALUES: Record<string, string> = {
  __SDK_VERSION__: JSON.stringify(VERSION),
  "process.env.BRAINTREE_JS_ENV": JSON.stringify(
    process.env.BRAINTREE_JS_ENV ?? "production"
  ),
  "process.env.BRAINTREE_JS_API_HOST": JSON.stringify(
    process.env.BRAINTREE_JS_API_HOST ?? ""
  ),
  "process.env.BRAINTREE_JS_API_PORT": JSON.stringify(
    process.env.BRAINTREE_JS_API_PORT ?? ""
  ),
  "process.env.BRAINTREE_JS_API_PROTOCOL": JSON.stringify(
    process.env.BRAINTREE_JS_API_PROTOCOL ?? ""
  ),
  "process.env.BRAINTREE_JS_ASSET_URL": JSON.stringify(
    process.env.BRAINTREE_JS_ASSET_URL ?? ""
  ),
  "process.env.BRAINTREE_JS_GRAPH_QL_ENDPOINT": JSON.stringify(
    process.env.BRAINTREE_JS_GRAPH_QL_ENDPOINT ?? ""
  ),
};
