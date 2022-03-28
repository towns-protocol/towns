import { themeLight } from "./theme";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },

  docs: {
    theme: themeLight,
  },
  // darkMode: { stylePreview: true, dark: themeDark, light: themeLight },
};
