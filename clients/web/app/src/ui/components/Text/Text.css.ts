import { style } from "@vanilla-extract/css";
import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "ui/styles/vars.css";

const nonResponsiveProperties = defineProperties({
  properties: {
    color: vars.color.text,
    fontWeight: vars.fontWeight,
    fontSize: vars.fontSize,
    textAlign: vars.textAlign,
    textTransform: vars.textTransform,
  },
  shorthands: {
    size: ["fontSize"],
  },
});

export const textSprinkles = createSprinkles(nonResponsiveProperties);
export type TextSprinkles = Parameters<typeof textSprinkles>[0];

export const singleLineStyle = style({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
