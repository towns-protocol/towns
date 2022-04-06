import { RecipeVariants, recipe } from "@vanilla-extract/recipes";
import { vars } from "ui/styles/vars.css";

export const buttonStyle = recipe({
  base: {
    border: "none",
    borderRadius: vars.borderRadius.xs,
  },
  defaultVariants: {
    size: "md",
  },
  variants: {
    size: {
      sm: {
        fontSize: vars.fontSize.sm,
        height: vars.dims.inputs.sm,
        fontWeight: vars.fontWeight.strong,
        paddingLeft: vars.space.xs,
        paddingRight: vars.space.xs,
        gap: vars.space.xxs,
      },
      md: {
        fontSize: vars.fontSize.md,
        height: vars.dims.inputs.md,
        fontWeight: vars.fontWeight.strong,
        paddingLeft: vars.space.sm,
        paddingRight: vars.space.sm,
        gap: vars.space.xs,
      },
      lg: {
        fontSize: vars.fontSize.lg,
        fontWeight: vars.fontWeight.strong,
        height: vars.dims.inputs.lg,
        padding: vars.space.sm,
        paddingLeft: vars.space.md,
        paddingRight: vars.space.md,
        gap: vars.space.sm,
      },
    },
  },
});

export type ButtonStyleVariants = RecipeVariants<typeof buttonStyle>;
