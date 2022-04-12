import { defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "ui/styles/breakpoints";
import { vars } from "ui/styles/vars.css";

export const iconProperties = defineProperties({
  ...responsivePropertiesMixin,
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
        padding: vars.space.xxs,
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
