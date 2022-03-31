import { recipe } from "@vanilla-extract/recipes";
import { vars } from "ui/styles/vars.css";

export const iconStyle = recipe({
  base: {
    borderRadius: vars.borderRadius.sm,
  },
  variants: {
    size: {
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
    },
    background: {
      default: {
        background: vars.color.background.default,
        padding: vars.space.none,
      },
      none: {
        background: vars.color.background.none,
        padding: vars.space.none,
      },
      transparent: {
        background: vars.color.background.none,
        padding: vars.space.none,
      },
      level1: {
        background: vars.color.background.level1,
        padding: vars.space.xxs,
        color: vars.color.text.muted,
      },
      level2: {
        background: vars.color.background.level2,
        padding: vars.space.xxs,
        color: vars.color.text.muted2,
      },
      level3: {
        background: vars.color.background.level3,
        padding: vars.space.xxs,
        color: vars.color.text.muted,
      },
      accent: {
        background: vars.color.background.accent,
        padding: vars.space.xxs,
        color: vars.color.text.inverted,
      },
      secondary: {
        background: vars.color.background.secondary,
        padding: vars.space.xxs,
        color: vars.color.text.inverted,
      },
      overlay: {
        background: vars.color.background.overlay,
        padding: vars.space.xxs,
      },
      inverted: {
        background: vars.color.background.inverted,
        color: vars.color.text.inverted,
        padding: vars.space.xxs,
      },
    },
  },
});

export type IconSizeVariants = keyof typeof iconStyle;
