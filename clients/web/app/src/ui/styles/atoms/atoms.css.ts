import { globalStyle, style } from "@vanilla-extract/css";
import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "../breakpoints";
import { debugClass } from "../css/debug.css";
import "../css/globals.css";
import { vars } from "../vars.css";
import { blockProperties } from "./properties/blockProperties.css";
import {
  aspectRatio,
  border,
  flexAlignment,
  flexDirection,
  flexGrow,
  flexJustifyAlignment,
} from "./properties/boxProperties.css";
import { colorAtomicProperties } from "./properties/colorProperties.css";
import { gridItemProperties } from "./properties/gridItemProperties.css";
import { typeProperties } from "./properties/textProperties.css";

const responsiveAtomicProperties = defineProperties({
  ...responsivePropertiesMixin,
  properties: {
    // display
    display: ["block", "flex", "grid", "inline-block", "none", "contents"],

    // size
    aspectRatio: aspectRatio,
    height: {
      ...vars.dims.baseline,
      ...vars.dims.height,
      ...vars.dims.screen,
    },
    minHeight: {
      ...vars.dims.baseline,
      ...vars.dims.height,
      ...vars.dims.screen,
    },
    maxHeight: {
      ...vars.dims.baseline,
      ...vars.dims.height,
      ...vars.dims.screen,
    },
    width: { ...vars.dims.baseline, ...vars.dims.height, ...vars.dims.screen },
    minWidth: {
      ...vars.dims.baseline,
      ...vars.dims.height,
      ...vars.dims.screen,
    },
    maxWidth: {
      ...vars.dims.baseline,
      ...vars.dims.height,
      ...vars.dims.screen,
    },

    square: {
      square_xxs: {
        height: vars.dims.square.square_xxs,
        width: vars.dims.square.square_xxs,
      },
      square_xs: {
        height: vars.dims.square.square_xs,
        width: vars.dims.square.square_xs,
      },
      square_sm: {
        height: vars.dims.square.square_sm,
        width: vars.dims.square.square_sm,
      },
      square_md: {
        height: vars.dims.square.square_md,
        width: vars.dims.square.square_md,
      },
      square_lg: {
        height: vars.dims.square.square_lg,
        width: vars.dims.square.square_lg,
      },
      square_xl: {
        height: vars.dims.square.square_xl,
        width: vars.dims.square.square_xl,
      },
      square_xxl: {
        height: vars.dims.square.square_xxl,
        width: vars.dims.square.square_xxl,
      },
      square_inline: {
        height: vars.dims.square.square_inline,
        width: vars.dims.square.square_inline,
      },
    },

    // padding
    paddingLeft: vars.space,
    paddingRight: vars.space,
    paddingTop: vars.space,
    paddingBottom: vars.space,

    // padding
    insetX: vars.insetX,
    insetY: vars.insetY,

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
    flexBasis: { ...vars.dims.height, ...vars.dims.screen },
    alignContent: { ...flexAlignment, baseline: "baseline" },
    alignItems: { ...flexAlignment, baseline: "baseline" },
    alignSelf: { ...flexAlignment, baseline: "baseline" },
    justifyContent: flexJustifyAlignment,
    justifySelf: flexAlignment,
  },

  shorthands: {
    basis: ["flexBasis"],
    direction: ["flexDirection"],
    inset: ["insetX", "insetY"],
    paddingX: ["paddingLeft", "paddingRight"],
    paddingY: ["paddingTop", "paddingBottom"],
    padding: ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"],

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
  gridItemProperties,
);

export type Atoms = Parameters<typeof atoms>[0];

export const boxStyleBase = style({}, "boxStyle");

globalStyle(`${debugClass}, ${debugClass} ${boxStyleBase}`, {
  boxShadow: "0 0 0 1px #09f7",
});

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
