// .storybook/YourTheme.js

import { create } from "@storybook/theming";
import { themes } from "@storybook/theming";

const base = {
  colorPrimary: "#00F",
  colorSecondary: "#00F",
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
  base: "dark",
  colorPrimary: "#00F",
  colorSecondary: "#00F",

  // UI
  appBg: "#111",
  appContentBg: "#000",
  appBorderColor: "rgba(127, 127, 127, 0.33)",
  appBorderRadius: 0,

  // Text colors
  textColor: "#FFF",
  textInverseColor: "#000",

  // Toolbar default and active colors
  barBg: "#090909",
  barTextColor: "#FFF",
  barSelectedColor: "#00F",

  // Form colors
  inputBg: "#090909",
  inputBorder: "#FFF",
  inputTextColor: "#FFF",
});
export const themeLight = create({
  ...themes.light,
  ...base,
  base: "light",

  // UI
  appBg: "#F9F9F9",
  appContentBg: "#FFF",
  appBorderColor: "rgba(127, 127, 127, 0.33)",

  // Text colors
  textColor: "#000",
  textInverseColor: "#000",

  // Toolbar default and active colors
  barBg: "#FFF",
  barTextColor: "#000",
  // barSelectedColor: "#0F9",

  // Form colors
  inputBg: "#F9F9F9",
  inputBorder: "#000",
  inputTextColor: "#000",
});
