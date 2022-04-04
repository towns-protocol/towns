import { recipe, RecipeVariants } from "@vanilla-extract/recipes";
import { vars } from "ui/styles/vars.css";

export const buttonStyle = recipe({
  base: {
    justifyContent: "center",
    alignItems: "center",
    color: vars.color.text.default,
  },
  defaultVariants: {
    size: "md",
  },
  variants: {
    size: {
      md: {
        height: vars.dims.inputs.sm,
        padding: vars.space.xs,
        borderRadius: vars.borderRadius.xs,
        border: "none",
      },
    },
  },
});

export type ButtonStyleVariants = RecipeVariants<typeof buttonStyle>;
