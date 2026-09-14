/* eslint-disable no-undef */
import { version as packageVersion } from "../package.json";
import packageJson from "../package.json";

globalThis.__SDK_VERSION__ = packageJson.version;

global.xit = (...args) => it.skip(...args);
global.xdescribe = (...args) => describe.skip(...args);
global.xtest = (...args) => test.skip(...args);
// Vitest doesn't populate npm_package_version the way `npm test` does.
// Set it from package.json so VERSION exports (process.env.npm_package_version)
// resolve correctly in tests.
if (!process.env.npm_package_version) {
  process.env.npm_package_version = packageVersion;
}
