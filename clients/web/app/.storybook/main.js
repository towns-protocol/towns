const { vanillaExtractPlugin } = require("@vanilla-extract/vite-plugin");
const tsconfigPaths = require("vite-tsconfig-paths").default;
const { mergeConfig } = require("vite");

module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-links"],
  framework: "@storybook/react",
  core: {
    builder: "@storybook/builder-vite",
  },
  webpackFinal: async (config, { configType }) => {
    // Trying to work around OOM building sotrybook on render.com
    // split into more chunks
    config.optimization = {
      splitChunks: {
        chunks: "all",
        minSize: 30 * 1024, // 30KB
        maxSize: 1024 * 1024, // 1MB
      },
    };

    return config;
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
      ...(configType.match(/development/i) ? { global: "window" } : {}),
    };

    // Trying to work around OOM building sotrybook on render.com
    // https://lightrun.com/answers/storybookjs-storybook-storybook-running-out-of-memory-when-building
    // config.build.sourcemap = false;
    config.build.minify = false;
    config.build.target = "es2021";
    return config;
  },
};
