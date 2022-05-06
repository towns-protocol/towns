import { style } from "@vanilla-extract/css";
import { defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "ui/styles/breakpoints";
import { vars } from "ui/styles/vars.css";
import { fontStyles } from "./Text.css";

const f = fontStyles.find((f) => f.fontFamily === "TitleFont")?.className;

console.log({ fontStyles, f });

export const base = style([
  {
    fontFamily: "TitleFont",
    fontWeight: "normal",
  },
  f ?? "",
]);

export const flexaProperties = defineProperties({
  ...responsivePropertiesMixin,
  properties: {
    fontVariationSettings: vars.fontVariationSettings,
    fontSize: vars.fontSize,
    textAlign: vars.textAlign,
    textTransform: vars.textTransform,
  },
});
