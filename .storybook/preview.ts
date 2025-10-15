import type { Preview } from "@storybook/html";
import packageJson from "../package.json";

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
      name: "SDK Version",
      description: "Braintree SDK version to load",
      defaultValue: "dev",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "dev", title: "Assets from local build" },
          {
            value: packageJson.version,
            title: `SDK v${packageJson.version} (current)`,
          },
        ],
      },
    },
  },
  tags: ["autodocs"],
};

export default preview;
