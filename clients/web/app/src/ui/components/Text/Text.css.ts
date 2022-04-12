import { globalStyle, style } from "@vanilla-extract/css";
import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { debugClass } from "ui/styles/css/debug.css";
import { vars } from "ui/styles/vars.css";

const nonResponsiveProperties = defineProperties({
  properties: {
    color: vars.color.foreground,
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

export const textBaseStyle = style({
  lineHeight: "1.2em",
  // display: "block",
  selectors: {
    "&:before": {
      display: "table",
      textAlign: "left",
      content: "",
      marginTop: "-0.18em",
    },
    "&:after": {
      content: "",
      display: "table",
      textAlign: "left",
      marginTop: "-.26em",
    },
  },
});

export const singleLineStyle = style({
  display: "block",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const truncateParentStyle = style({
  overflow: "hidden",
  padding: "0.2em 0",
  margin: "-0.2em 0",
});
/**
 * Greens for Text elements
 */
globalStyle(`${debugClass}, ${debugClass} ${textBaseStyle}`, {
  boxShadow: "0 0 0 1px #0F09",
});

export type TextSprinkles = Parameters<typeof textSprinkles>[0];
