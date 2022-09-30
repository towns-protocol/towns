import { globalStyle } from "@vanilla-extract/css";
import { vars } from "../vars.css";
import "./debug.css";
import "./fonts.css";

globalStyle("html, body", {
  minHeight: "100vh",
  textRendering: "optimizeLegibility",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  fontSize: vars.fontSize.md,
});

globalStyle("*", {
  margin: 0,
  padding: 0,
  border: 0,
  boxSizing: "border-box",
  verticalAlign: "baseline",
  WebkitTapHighlightColor: "transparent",
});

globalStyle("ul, ol", {
  listStyle: "none",
});

globalStyle("h1", {
  fontSize: vars.fontSize.h1,
});

globalStyle("h2", {
  fontSize: vars.fontSize.h2,
});

globalStyle("h3", {
  fontSize: vars.fontSize.h3,
});

globalStyle("h4", {
  fontSize: vars.fontSize.lg,
});

globalStyle("p", {
  fontSize: vars.fontSize.md,
});

globalStyle("table", {
  borderCollapse: "collapse",
  borderSpacing: 0,
});

globalStyle("a", {
  textDecoration: "none",
  color: "inherit",
});
