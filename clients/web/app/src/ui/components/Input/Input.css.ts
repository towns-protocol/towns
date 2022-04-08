import { RecipeVariants, recipe } from "@vanilla-extract/recipes";
import { vars } from "ui/styles/vars.css";

export const inputStyle = recipe({
  base: {
    background: vars.color.layer.level2,
    "::placeholder": {
      color: vars.color.text.gray2,
    },
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

export type InputStyleVariants = RecipeVariants<typeof inputStyle>;
