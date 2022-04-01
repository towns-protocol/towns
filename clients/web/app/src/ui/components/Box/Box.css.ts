import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "ui/styles/vars.css";
import "../../styles/globals.css";

const flexDirection = {
  row: "row",
  column: "column",
} as const;

const border = {
  default: `1px solid ${vars.color.text.muted3}`,
  strong: `1px solid ${vars.color.text.default}`,
  inverted: `1px solid ${vars.color.text.inverted}`,
} as const;

const aspectRatio = {
  square: "1",
  "1/1": "1",
  "4/3": "4 / 3",
  "3/4": "3 / 4",
  "16/9": "16 / 9",
  "9/16": "9 / 16",
  "2/1": "2 / 1",
  "1/2": "1 / 2",
  "3/1": "3 / 1",
  "1/3": "1 / 3",
};

export const flexAlignment = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
} as const;

export const flexJustifyAlignment = {
  ...flexAlignment,
  spaceAround: "space-around",
  spaceBetween: "space-between",
} as const;

export const boxShadow = {
  card: `0 0 40px #191B222`,
};

const flexGrow = {
  x0: 0,
  x1: 1,
  x2: 2,
  x3: 3,
  x4: 4,
  x5: 5,
  x6: 6,
  x7: 7,
  x8: 8,
  x9: 9,
} as const;

const gridItemProperties = defineProperties({
  conditions: {
    mobile: {},
    tablet: { "@media": "screen and (min-width: 768px)" },
    desktop: { "@media": "screen and (min-width: 1100px)" },
    large: { "@media": "screen and (min-width: 1440)" },
  },
  defaultCondition: "desktop",
  properties: {
    gridColumn: vars.colSpan,
  },
  shorthands: {
    colSpan: ["gridColumn"],
  },
});

const colorProperties = defineProperties({
  conditions: {
    lightMode: {},
    darkMode: { "@media": "(prefers-color-scheme: dark)" },
  },
  defaultCondition: "lightMode",
  properties: {
    // colors
    background: {
      default: {
        background: vars.color.background.default,
      },
      none: {
        background: vars.color.background.none,
      },
      level1: {
        background: vars.color.background.level1,
      },
      level2: {
        background: vars.color.background.level2,
        color: vars.color.text.muted2,
      },
      level3: {
        background: vars.color.background.level3,
      },
      secondary: {
        background: vars.color.background.secondary,
        color: vars.color.text.inverted,
      },
      overlay: {
        background: vars.color.background.overlay,
        color: vars.color.text.inverted,
      },
      accent: {
        background: vars.color.background.accent,
        color: vars.color.text.inverted,
      },
      inverted: {
        background: vars.color.background.inverted,
        color: vars.color.text.inverted,
      },
    },
    color: vars.color.text,
  },
});

const responsiveProperties = defineProperties({
  conditions: {
    mobile: {},
    tablet: { "@media": "screen and (min-width: 768px)" },
    desktop: { "@media": "screen and (min-width: 1100px)" },
    large: { "@media": "screen and (min-width: 1600px)" },
  },
  defaultCondition: "desktop",
  properties: {
    // display
    position: ["relative", "absolute", "fixed", "static", "sticky"],
    display: ["block", "flex", "grid", "inline-block", "none", "contents"],
    // size
    aspectRatio: aspectRatio,
    height: vars.dims.rows,
    minHeight: vars.dims.rows,
    maxHeight: vars.dims.rows,
    width: { ...vars.dims.rows, ...vars.dims.screens },
    minWidth: { ...vars.dims.rows, ...vars.dims.screens },
    maxWidth: { ...vars.dims.rows, ...vars.dims.screens },
    // padding
    paddingLeft: vars.space,
    paddingRight: vars.space,
    paddingTop: vars.space,
    paddingBottom: vars.space,
    // border
    borderLeft: border,
    borderRight: border,
    borderTop: border,
    borderBottom: border,
    borderRadius: vars.borderRadius,
    // flex
    flexDirection: flexDirection,
    gap: vars.space,
    flexWrap: ["wrap", "nowrap"],
    flexGrow: flexGrow,
    flexShrink: flexGrow,
    alignItems: { ...flexAlignment, baseline: "baseline" },
    alignSelf: { ...flexAlignment, baseline: "baseline" },
    justifyContent: flexJustifyAlignment,
    justifySelf: flexAlignment,
    overflow: ["hidden", "visible", "auto"],
  },
  shorthands: {
    direction: ["flexDirection"],
    paddingX: ["paddingLeft", "paddingRight"],
    paddingY: ["paddingTop", "paddingBottom"],
    padding: ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"],
    square: ["width", "height"],
    border: ["borderLeft", "borderRight", "borderTop", "borderBottom"],
  },
});

export const sprinkles = createSprinkles(
  colorProperties,
  responsiveProperties,
  gridItemProperties
);

export type Sprinkles = Parameters<typeof sprinkles>[0];
