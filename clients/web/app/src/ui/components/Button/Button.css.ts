import { RecipeVariants, recipe } from "@vanilla-extract/recipes";
import { vars } from "ui/styles/vars.css";

export const buttonStyle = recipe({
  base: {
    border: "none",
    whiteSpace: "nowrap",
    borderRadius: vars.borderRadius.xs,
    transition: "all 1s",

    selectors: {
      "&:hover": {
        transition: "all 320ms",
        boxShadow: `0 0 0px 1px ${vars.color.tone.cta1}`,
      },
    },
  },
  defaultVariants: {
    size: "input_md",
  },
  variants: {
    size: {
      input_sm: {
        fontSize: vars.fontSize.sm,
        height: vars.dims.input.input_sm,
        fontVariationSettings: vars.fontVariationSettings.normal,
        paddingLeft: vars.space.sm,
        paddingRight: vars.space.sm,
        gap: vars.space.xs,
      },
      input_md: {
        fontSize: vars.fontSize.sm,
        height: vars.dims.input.input_md,
        fontVariationSettings: vars.fontVariationSettings.normal,
        paddingLeft: vars.space.md,
        paddingRight: vars.space.md,
        gap: vars.space.sm,
      },
      input_lg: {
        fontSize: vars.fontSize.lg,
        fontVariationSettings: vars.fontVariationSettings.strong,
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
