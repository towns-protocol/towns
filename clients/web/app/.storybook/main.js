const { vanillaExtractPlugin } = require("@vanilla-extract/vite-plugin");
const tsconfigPaths = require("vite-tsconfig-paths").default;

const path = require("path");

module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  framework: "@storybook/react",
  core: {
    builder: "storybook-builder-vite",
  },
  // https://github.com/eirslett/storybook-builder-vite
  async viteFinal(config, { configType }) {
    config.plugins = [
      ...config.plugins,
      tsconfigPaths(),
      vanillaExtractPlugin(),
    ];
    return config;
  },
};
