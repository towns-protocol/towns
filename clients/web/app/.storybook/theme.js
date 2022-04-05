// .storybook/YourTheme.js

import { create } from "@storybook/theming";
import { themes } from "@storybook/theming";

const base = {
  appBorderRadius: 0,
  fontBase:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
  fontCode: "monospace",
  inputBorderRadius: 0,
  brandTitle: "Harmony",
  // brandUrl: "https://hntlabs.com",
  // brandImage: "https://hntlabs.com/hntlabs_og.png",
};

export const themeDark = create({
  ...themes.dark,
  ...base,
  appBg: "#202025",
  appContentBg: "#202025",
  barBg: "#191919",
});

export const themeLight = create({
  ...themes.light,
  ...base,
  appBg: "#F0F0F0",
  appContentBg: "#F0F0F0",
  barBg: "#FFF",
});
