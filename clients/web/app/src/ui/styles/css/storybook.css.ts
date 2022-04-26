import { globalStyle, style } from "@vanilla-extract/css";
import { darkTheme, lightTheme, vars } from "../vars.css";
import "./globals.css";

export const lightClass = lightTheme;
export const darkClass = darkTheme;

export const previewClass = style({
  background: vars.color.layer.default,
  color: vars.color.text.default,
});

globalStyle("body", {
  background: vars.color.layer.default,
  color: vars.color.text.default,
});
