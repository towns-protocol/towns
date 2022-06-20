import { globalStyle } from "@vanilla-extract/css";
import { vars } from "../vars.css";

globalStyle(":root", {
  fontFamily: "BodyFont, sans-serif",
});

globalStyle("h1, h2, h3, h4, h5", {
  fontFamily: "TitleFont, sans-serif",
});

globalStyle("p", {
  fontSize: vars.fontSize.md,
});

globalStyle("strong", {
  fontVariationSettings: vars.fontVariationSettings.strong,
});

globalStyle("*", {
  fontSize: "100%",
  font: "inherit",
});

globalStyle("body, button", {
  lineHeight: "100%",
});
