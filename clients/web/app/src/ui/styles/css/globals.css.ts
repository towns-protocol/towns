import { globalStyle } from "@vanilla-extract/css";
import { vars } from "../vars.css";
import "./debug.css";
import "./fonts.css";

globalStyle("html, body", {
  minHeight: "100vh",
  // fontFamily: "Nunito, sans-serif",
  textRendering: "optimizeLegibility",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "gray1scale",
  fontSize: vars.fontSize.lg,
});

globalStyle("*", {
  margin: 0,
  padding: 0,
  border: 0,
  boxSizing: "border-box",
  fontSize: "100%",
  font: "inherit",
  verticalAlign: "baseline",
  WebkitTapHighlightColor: "transparent",
});

globalStyle("ul,ol", {
  listStyle: "none",
});

globalStyle("table", {
  borderCollapse: "collapse",
  borderSpacing: 0,
});

globalStyle("body, button", {
  fontSize: vars.fontSize.md,
  lineHeight: "100%",
});

globalStyle("a", {
  textDecoration: "none",
  color: "inherit",
});
