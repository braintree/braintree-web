import type { StorybookConfig } from "storybook/internal/types";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "./stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-styling-webpack"],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
  docs: {
    defaultName: "Documentation",
  },
  staticDirs: ["./static"],
};
export default config;
