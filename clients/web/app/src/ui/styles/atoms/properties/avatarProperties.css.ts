import { defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "ui/styles/breakpoints";
import { vars } from "ui/styles/vars.css";

export const avatarSizes = {
  sm: {
    width: vars.dims.icons.sm,
    height: vars.dims.icons.sm,
    borderRadius: vars.borderRadius.xs,
  },
  md: {
    width: vars.dims.icons.md,
    height: vars.dims.icons.md,
    borderRadius: vars.borderRadius.sm,
  },
  lg: {
    width: vars.dims.icons.lg,
    height: vars.dims.icons.lg,
    borderRadius: vars.borderRadius.md,
  },
  xl: {
    width: vars.dims.icons.xl,
    height: vars.dims.icons.xl,
    borderRadius: vars.borderRadius.md,
  },
  xxl: {
    width: vars.dims.icons.xxl,
    height: vars.dims.icons.xxl,
    borderRadius: vars.borderRadius.md,
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
