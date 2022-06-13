const { vanillaExtractPlugin } = require("@vanilla-extract/vite-plugin");
const tsconfigPaths = require("vite-tsconfig-paths").default;

module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-links"],
  framework: "@storybook/react",
  core: {
    builder: "@storybook/builder-vite",
  },
  // https://github.com/eirslett/storybook-builder-vite
  async viteFinal(config, { configType }) {
    config.plugins.push(
      tsconfigPaths({
        // `loose` fixes path issues within .mdx files
        loose: true,
      }),
      vanillaExtractPlugin(),
    );

    config.define = {
      ...config.define,
      global: "window",
    };

    return config;
  },
};
