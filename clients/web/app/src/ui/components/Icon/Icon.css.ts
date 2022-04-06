import { recipe } from "@vanilla-extract/recipes";
import { vars } from "ui/styles/vars.css";

export const iconStyle = recipe({
  base: {
    borderRadius: vars.borderRadius.sm,
  },
  variants: {
    size: {
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
});

export type IconSizeVariants = keyof typeof iconStyle;
