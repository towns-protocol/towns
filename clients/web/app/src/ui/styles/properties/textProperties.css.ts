import { defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "ui/styles/breakpoints";
import { vars } from "ui/styles/vars.css";

export const typeProperties = defineProperties({
  ...responsivePropertiesMixin,
  properties: {
    fontVariationSettings: vars.fontVariationSettings,
    fontSize: vars.fontSize,
    textAlign: vars.textAlign,
    textTransform: vars.textTransform,
  },
  shorthands: {
    fontWeight: ["fontVariationSettings"],
  },
});
