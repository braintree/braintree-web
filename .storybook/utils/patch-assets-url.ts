import { braintreeWebSDKLoader } from "./BraintreeWebSDKLoader";

interface PatchableClient {
  getConfiguration: () => {
    gatewayConfiguration: { assetsUrl: string; [key: string]: unknown };
    [key: string]: unknown;
  };
}

interface PatchedFn {
  __assetsUrlPatched?: boolean;
}

/**
 * Override the client's `getConfiguration().gatewayConfiguration.assetsUrl`
 * to point at the local Storybook origin so iframe-based components (e.g.,
 * `venmo-desktop-frame.html`) load from the local build instead of the CDN.
 *
 * Only patches when the SDK loader is on the "dev" version — selecting a
 * CDN version from the toolbar leaves `assetsUrl` alone so the iframe URL
 * matches the chosen SDK version on the CDN.
 *
 * The method itself must be wrapped (not the returned object) because
 * `getConfiguration()` returns a fresh `JSON.parse()` copy on every call.
 */
export function patchClientAssetsUrlForLocalDev(client: PatchableClient): void {
  if (braintreeWebSDKLoader.getCurrentVersion() !== "dev") {
    return;
  }

  const existing = client.getConfiguration as PatchedFn;
  if (existing.__assetsUrlPatched) {
    return;
  }

  const original = client.getConfiguration.bind(client);
  const wrapped = function () {
    const config = original();
    config.gatewayConfiguration.assetsUrl = window.location.origin;
    return config;
  } as PatchableClient["getConfiguration"] & PatchedFn;
  wrapped.__assetsUrlPatched = true;
  client.getConfiguration = wrapped;
}
