import { defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "ui/styles/vars.css";
import { responsivePropertiesMixin } from "ui/styles/breakpoints";

export const avatarSizes = {
  avatar_xs: {
    width: vars.dims.square.square_xs,
    height: vars.dims.square.square_xs,
    "--size": vars.dims.square.square_xs,
  },
  avatar_sm: {
    width: vars.dims.square.square_sm,
    height: vars.dims.square.square_sm,
    "--size": vars.dims.square.square_sm,
  },
  avatar_md: {
    width: vars.dims.square.square_md,
    height: vars.dims.square.square_md,
    "--size": vars.dims.square.square_md,
  },
  avatar_lg: {
    width: vars.dims.square.square_lg,
    height: vars.dims.square.square_lg,
    "--size": vars.dims.square.square_lg,
  },
  // revisit when sizes are settled
  avatar_x6: {
    width: vars.dims.baseline.x6,
    height: vars.dims.baseline.x6,
    "--size": vars.dims.baseline.x6,
  },
  avatar_xl: {
    width: vars.dims.square.square_xl,
    height: vars.dims.square.square_xl,
    "--size": vars.dims.square.square_xl,
  },
  avatar_xxl: {
    width: vars.dims.square.square_xxl,
    height: vars.dims.square.square_xxl,
    "--size": vars.dims.square.square_xxl,
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
