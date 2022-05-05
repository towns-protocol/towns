import { RecipeVariants, recipe } from "@vanilla-extract/recipes";
import { vars } from "ui/styles/vars.css";

export const buttonStyle = recipe({
  base: {
    border: "none",
    borderRadius: vars.borderRadius.xs,
  },
  defaultVariants: {
    size: "input_md",
  },
  variants: {
    size: {
      input_sm: {
        fontSize: vars.fontSize.sm,
        height: vars.dims.input.input_sm,
        fontWeight: vars.fontWeight.strong,
        paddingLeft: vars.space.sm,
        paddingRight: vars.space.sm,
        gap: vars.space.xs,
      },
      input_md: {
        fontSize: vars.fontSize.md,
        height: vars.dims.input.input_md,
        fontWeight: vars.fontWeight.strong,
        paddingLeft: vars.space.md,
        paddingRight: vars.space.md,
        gap: vars.space.sm,
      },
      input_lg: {
        fontSize: vars.fontSize.lg,
        fontWeight: vars.fontWeight.strong,
        height: vars.dims.input.input_lg,
        padding: vars.space.md,
        paddingLeft: vars.space.lg,
        paddingRight: vars.space.lg,
        gap: vars.space.md,
      },
    },
  },
});

export type ButtonStyleVariants = RecipeVariants<typeof buttonStyle>;
