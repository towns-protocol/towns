import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "ui/styles/vars.css";
import "../../styles/globals.css";

const nonResponsiveProperties = defineProperties({
  properties: {
    color: vars.color.text,
    fontWeight: vars.fontWeight,
    fontSize: vars.fontSize,
  },
  shorthands: {
    size: ["fontSize"],
  },
});

export const textSprinkles = createSprinkles(nonResponsiveProperties);
export type TextSprinkles = Parameters<typeof textSprinkles>[0];
