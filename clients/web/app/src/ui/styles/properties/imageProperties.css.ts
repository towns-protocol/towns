import { defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "ui/styles/breakpoints";

export const imageProperties = defineProperties({
  ...responsivePropertiesMixin,
  properties: {
    fit: {
      width: { width: "100%", height: "auto" },
      height: { height: "100%", width: "auto" },
      full: { height: "100%", width: "100%" },
    },
    objectFit: ["contain", "cover", "fill"],
    objectPosition: {
      topLeft: "0% 0%",
      topCenter: "50% 0%",
      topRight: "100% 0%",
      centerLeft: "0% 50%",
      center: "50% 50%",
      centerRight: "100% 50%",
      bottomLeft: "100%",
      bottomCenter: "50% 100%",
      bottomRight: "100% 100%",
    },
  },
  shorthands: {},
});
