import type { Preview } from "@storybook/html-vite";
import "./css/main.css";
import versions from "./versions.json";
import { braintreeWebSDKLoader } from "./utils/BraintreeWebSDKLoader";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    sdkVersion: {
      description: "Braintree Web SDK version",
      toolbar: {
        title: "SDK Version",
        icon: "cog",
        items: versions,
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    // Default to "dev" (local build) for development workflow
    sdkVersion: "dev",
  },
  loaders: [
    async ({ globals, parameters }) => {
      let version: string = globals.sdkVersion || "dev";

      const urlParams = new URLSearchParams(window.location.search);
      const globalsParam = urlParams.get("globals");

      if (globalsParam) {
        const match = globalsParam.match(/sdkVersion:([^;&]+)/);

        if (match) {
          version = match[1];
        }
      }

      const scripts: string[] = parameters?.braintreeScripts || [];

      try {
        await braintreeWebSDKLoader.loadSDK(version, scripts);
      } catch (error) {
        // Log error but don't block story rendering - let story handle error display
        // eslint-disable-next-line no-console
        console.error("SDK loader error:", error);
      }

      // Return loaded version for story context
      return {
        sdkVersion: version,
        sdkReady: braintreeWebSDKLoader.isReady(),
      };
    },
  ],
  tags: ["autodocs"],
};

export default preview;
