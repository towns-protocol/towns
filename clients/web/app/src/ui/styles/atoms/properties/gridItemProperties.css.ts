import { defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "ui/styles/breakpoints";
import { vars } from "ui/styles/vars.css";

export const gridItemProperties = defineProperties({
  ...responsivePropertiesMixin,
  properties: {
    gridColumn: vars.colSpan,
  },
  shorthands: {
    colSpan: ["gridColumn"],
  },
});
