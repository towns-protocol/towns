import { useCallback, useEffect } from "react";
import { useStore } from "store/store";
import { atoms } from "ui/styles/atoms/atoms.css";
import { darkTheme, lightTheme } from "ui/styles/vars.css";

type ThemeSettings = {
  ammendHTMLBody: boolean;
  useDefaultOSTheme: boolean;
};

export const useRootTheme = (settings: ThemeSettings) => {
  const { theme, setTheme } = useStore((state) => ({
    theme: state.theme,
    setTheme: state.setTheme,
  }));

  const { ammendHTMLBody = false, useDefaultOSTheme = false } = settings;

  useEffect(() => {
    if (typeof theme === "undefined") {
      const defaultDark =
        !useDefaultOSTheme ||
        !window.matchMedia("(prefers-color-scheme: dark)").matches;

      setTheme(defaultDark ? "dark" : "light");
    }
  }, [setTheme, theme, useDefaultOSTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  const themeClass = theme === "light" ? lightTheme : darkTheme;

  useEffect(() => {
    if (ammendHTMLBody) {
      document.body.classList.add(atoms({ color: "default" }));
      document.body.classList.add(atoms({ background: "default" }));
      return () => {
        document.body.classList.remove(atoms({ color: "default" }));
        document.body.classList.remove(atoms({ background: "default" }));
      };
    }
  }, [ammendHTMLBody]);

  useEffect(() => {
    if (settings.ammendHTMLBody) {
      document.body.classList.add(themeClass);
      return () => {
        document.body.classList.remove(lightTheme);
        document.body.classList.remove(darkTheme);
      };
    }
  }, [settings.ammendHTMLBody, themeClass]);

  return { toggleTheme, theme };
};
