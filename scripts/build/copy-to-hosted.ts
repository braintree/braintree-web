import { cpSync } from "node:fs";
import path from "node:path";
import { DIST_DIRECTORY, VERSION } from "./vite/configs/shared.ts";

const dest = process.env.BRAINTREE_JS_HOSTED_DEST;
if (!dest) {
  throw new Error(
    "BRAINTREE_JS_HOSTED_DEST must be set to the hosted-client-libraries path"
  );
}

// The combined index bundle never ships to the CDN. Exclude it so a stale one
// left in a dirty local dist can't leak into a release.
cpSync(DIST_DIRECTORY, path.resolve(dest, "web", VERSION), {
  recursive: true,
  filter: (source) => !/[/\\]js[/\\]index\./.test(source),
});
