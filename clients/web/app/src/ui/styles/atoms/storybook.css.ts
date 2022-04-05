import { globalStyle, style } from "@vanilla-extract/css";
import { darkTheme, lightTheme, vars } from "../vars.css";
import "./globals.css";

export const lightClass = darkTheme;
export const darkClass = lightTheme;

export const previewClass = style({
  background: vars.color.background.default,
  color: vars.color.text.default,
});

globalStyle("body", {
  background: vars.color.background.default,
  color: vars.color.text.default,
});
