import { defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "ui/styles/breakpoints";
import { vars } from "ui/styles/vars.css";

export const avatarSizes = {
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
} as const;

export const avatarProperties = defineProperties({
  ...responsivePropertiesMixin,
  properties: {
    height: avatarSizes,
  },
  shorthands: {
    size: ["height"],
  },
});
