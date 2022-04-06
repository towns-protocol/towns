import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "../vars.css";
import "./globals.css";

const flexDirection = {
  row: "row",
  column: "column",
} as const;

const border = {
  default: `1px solid ${vars.color.background.level3}`,
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
    large: { "@media": "screen and (min-width: 1600px)" },
  },
  defaultCondition: "mobile",
  properties: {
    gridColumn: vars.colSpan,
  },
  shorthands: {
    colSpan: ["gridColumn"],
  },
});

const colorAtomicProperties = defineProperties({
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
        color: vars.color.text.muted,
      },
      level3: {
        background: vars.color.background.level3,
      },
      overlay: {
        background: vars.color.background.overlay,
        color: vars.color.text.inverted,
      },
      inverted: {
        background: vars.color.background.inverted,
        color: vars.color.text.inverted,
      },
      critical: {
        background: vars.color.background.critical,
        color: vars.color.text.onSemantic,
      },
      warning: {
        background: vars.color.background.warning,
        color: vars.color.text.onSemantic,
      },
      positive: {
        background: vars.color.background.positive,
        color: vars.color.text.onSemantic,
      },
      neutral: {
        background: vars.color.background.neutral,
        color: vars.color.text.onSemantic,
      },
      accent: {
        background: vars.color.background.accent,
        color: vars.color.text.onSemantic,
      },
    },
    color: vars.color.text,
  },
});

const typeProperties = defineProperties({
  properties: {
    fontWeight: vars.fontWeight,
    fontSize: vars.fontSize,
    textAlign: vars.textAlign,
    textTransform: vars.textTransform,
  },
});

const unresponsiveAtomicProperties = defineProperties({
  properties: {
    position: ["relative", "absolute", "fixed", "static", "sticky"],
    overflow: ["hidden", "visible", "auto"],
    cursor: [
      "auto",
      "default",
      "none",
      "context-menu",
      "help",
      "pointer",
      "progress",
      "wait",
      "cell",
      "crosshair",
      "text",
      "vertical-text",
      "alias",
      "copy",
      "move",
      "no-drop",
      "not-allowed",
      "all-scroll",
      "col-resize",
      "row-resize",
      "n-resize",
      "e-resize",
      "s-resize",
      "w-resize",
      "ns-resize",
      "ew-resize",
      "ne-resize",
      "nw-resize",
      "se-resize",
      "sw-resize",
      "nesw-resize",
      "nwse-resize",
    ],
  },
});

const responsiveAtomicProperties = defineProperties({
  conditions: {
    mobile: {},
    tablet: { "@media": "screen and (min-width: 768px)" },
    desktop: { "@media": "screen and (min-width: 1100px)" },
    large: { "@media": "screen and (min-width: 1600px)" },
  },
  defaultCondition: "mobile",
  properties: {
    // display
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

export const atoms = createSprinkles(
  colorAtomicProperties,
  typeProperties,
  unresponsiveAtomicProperties,
  responsiveAtomicProperties,
  gridItemProperties
);

export type Atoms = Parameters<typeof atoms>[0];

/* 

// NOTE: might become handy implementing responsive values
// -------------------------------------------------------

export type OptionalResponsiveValue<Value extends string | number> =
  ConditionalValue<typeof responsiveAtomicProperties, Value>;
export type RequiredResponsiveValue<Value extends string | number> =
  RequiredConditionalValue<typeof responsiveAtomicProperties, Value>;

export type RequiredResponsiveObject<Value> = Partial<
  Record<Breakpoint, Value>
> &
  Record<typeof breakpointNames[0], Value>;

export const normalizeResponsiveValue = createNormalizeValueFn(
  responsiveAtomicProperties
);
export const mapResponsiveValue = createMapValueFn(responsiveAtomicProperties);

export type ColorModeValue<Value extends string | number> = ConditionalValue<
  typeof colorAtomicProperties,
  Value
>;
export const mapColorModeValue = createMapValueFn(colorAtomicProperties);
*/
