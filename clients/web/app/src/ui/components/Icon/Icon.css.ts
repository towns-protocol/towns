import { style } from "@vanilla-extract/css";
import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { responsiveConditions } from "ui/styles/breakpoints";
import { vars } from "ui/styles/vars.css";

export const iconProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: "desktop",
  properties: {
    height: {
      xxs: {
        width: vars.dims.icons.xxs,
        height: vars.dims.icons.xxs,
      },
      xs: {
        width: vars.dims.icons.xs,
        height: vars.dims.icons.xs,
      },
      sm: {
        width: vars.dims.icons.sm,
        height: vars.dims.icons.sm,
      },
      md: {
        width: vars.dims.icons.md,
        height: vars.dims.icons.md,
      },
      lg: {
        width: vars.dims.icons.lg,
        height: vars.dims.icons.lg,
      },
      xl: {
        width: vars.dims.icons.xl,
        height: vars.dims.icons.xl,
      },
      xxl: {
        width: vars.dims.icons.xxl,
        height: vars.dims.icons.xxl,
      },
      adapt: {
        width: vars.dims.icons.adapt,
        height: vars.dims.icons.adapt,
      },
    },
  },
  shorthands: {
    size: ["height"],
  },
});

export const iconAtoms = createSprinkles(iconProperties);

export const iconBaseStyle = style({
  borderRadius: vars.borderRadius.sm,
});

export type IconAtoms = Parameters<typeof iconAtoms>[0];
