import { globalStyle, style } from "@vanilla-extract/css";
import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { boxStyleBase } from "ui/styles/atoms/atoms.css";
import { debugClass } from "ui/styles/css/debug.css";
import { vars } from "ui/styles/vars.css";

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - dynamic properties

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

export type TextSprinkles = Parameters<typeof textSprinkles>[0];
export const textSprinkles = createSprinkles(nonResponsiveProperties);

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  base properties

/**
 * trim space before and after blocks in order to make spacing consistent.
 * inspiration: https://github.com/seek-oss/capsize
 */
const fontSettings = {
  trimTop: "-0.26em",
  trimBottom: "-0.24em",
  lineHeight: "1.24em",
} as const;

/* space between lines  */
const baseProperties = {
  lineHeight: fontSettings.lineHeight,
};

const styleBefore = {
  content: "",
  display: "table",
  textAlign: "left",
  marginTop: fontSettings.trimTop,
} as const;

const styleAfter = {
  content: "",
  display: "table",
  textAlign: "left",
  marginTop: fontSettings.trimBottom,
} as const;

/**
 * Apply cap-sized style via vanilla extract
 */
export const textBaseStyle = style({
  ...baseProperties,
  selectors: {
    "&:before": styleBefore,
    "&:after": styleAfter,
  },
});

/**
 * Inherit consistent line-spacing for raw HTML inside scoped elements
 */
globalStyle(`${boxStyleBase} p`, baseProperties);
globalStyle(`${boxStyleBase} p:before `, styleBefore);
globalStyle(`${boxStyleBase} p:after `, styleAfter);

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - paragraph margin

globalStyle(`${boxStyleBase} p + p`, {
  marginTop: vars.space.sm,
});

/**
 * Reset top margin for nested blocks
 */
globalStyle(
  `${textBaseStyle} ${textBaseStyle}:before, ${textBaseStyle} ${textBaseStyle}:after`,
  {
    marginTop: 0,
  }
);

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - global text decoration

/**
 * Links
 */
globalStyle(`${textBaseStyle} a`, {
  color: vars.color.foreground.accent,
});

/**
 * Strong text
 */
globalStyle(`${textBaseStyle} strong`, {
  fontWeight: vars.fontWeight.strong,
  color: vars.color.text.default,
});

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - truncated text

/**
 * Handle truncated text
 **/
export const truncateTextStyle = style({
  display: "block",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

/**
 * Since the bounding box is trimmed we need to add some generouse virtual
 * padding in order not get asc/descenders cut-off
 */
export const truncateParentStyle = style({
  overflow: "hidden",
  padding: "0.5em 0",
  margin: "-0.5em 0",
});

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -debugging

/**
 * Adds  outlines on text element when debug class is present. Explicitely
 * hide debugging for trunccated elements as the "virtual" padding is misleading.
 */
globalStyle(`${debugClass} ${textBaseStyle}:not(${truncateParentStyle})`, {
  boxShadow: "0 0 0 1px #FF09",
});
globalStyle(`${debugClass} p:not(${textBaseStyle})`, {
  // implicit paragraphs declared by inner HTML
  boxShadow: "0 0 0 1px #9F09",
});
