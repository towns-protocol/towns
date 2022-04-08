import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "../breakpoints";
import "../css/globals.css";
import { vars } from "../vars.css";
import { blockProperties } from "./properties/blockProperties.css";
import { colorAtomicProperties } from "./properties/colorProperties.css";
import { gridItemProperties } from "./properties/gridItemProperties.css";
import { typeProperties } from "./properties/textProperties.css";

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

const responsiveAtomicProperties = defineProperties({
  ...responsivePropertiesMixin,
  properties: {
    // display
    display: ["block", "flex", "grid", "inline-block", "none", "contents"],

    // size
    aspectRatio: aspectRatio,
    height: { ...vars.dims.rows, ...vars.dims.screens },
    minHeight: { ...vars.dims.rows, ...vars.dims.screens },
    maxHeight: { ...vars.dims.rows, ...vars.dims.screens },
    width: { ...vars.dims.rows, ...vars.dims.screens },
    minWidth: { ...vars.dims.rows, ...vars.dims.screens },
    maxWidth: { ...vars.dims.rows, ...vars.dims.screens },

    // padding
    paddingLeft: vars.space,
    paddingRight: vars.space,
    paddingTop: vars.space,
    paddingBottom: vars.space,

    // padding
    negativeMargin: vars.negativeSpace,

    // border
    borderLeft: border,
    borderRight: border,
    borderTop: border,
    borderBottom: border,
    borderRadius: vars.borderRadius,
    borderTopLeftRadius: vars.borderRadius,
    borderTopRightRadius: vars.borderRadius,
    borderBottomLeftRadius: vars.borderRadius,
    borderBottomRightRadius: vars.borderRadius,

    // flex
    flexDirection: flexDirection,
    gap: vars.space,
    flexWrap: ["wrap", "nowrap"],
    flexGrow: flexGrow,
    flexShrink: flexGrow,
    flexBasis: { ...vars.dims.rows, ...vars.dims.screens },
    alignContent: { ...flexAlignment, baseline: "baseline" },
    alignItems: { ...flexAlignment, baseline: "baseline" },
    alignSelf: { ...flexAlignment, baseline: "baseline" },
    justifyContent: flexJustifyAlignment,
    justifySelf: flexAlignment,
  },

  shorthands: {
    basis: ["flexBasis"],
    direction: ["flexDirection"],
    paddingX: ["paddingLeft", "paddingRight"],
    paddingY: ["paddingTop", "paddingBottom"],
    padding: ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"],
    square: ["width", "height"],
    border: ["borderLeft", "borderRight", "borderTop", "borderBottom"],
    rounded: [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius",
    ],
    roundedTop: ["borderTopLeftRadius", "borderTopRightRadius"],
    roundedBottom: ["borderBottomLeftRadius", "borderBottomRightRadius"],
    roundedRight: ["borderTopRightRadius", "borderBottomRightRadius"],
    roundedLeft: ["borderTopLeftRadius", "borderBottomLeftRadius"],
  },
});

export const atoms = createSprinkles(
  colorAtomicProperties,
  typeProperties,
  blockProperties,
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
