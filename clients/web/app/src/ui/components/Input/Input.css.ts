import { style } from "@vanilla-extract/css";
import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { responsivePropertiesMixin } from "ui/styles/breakpoints";
import { vars } from "ui/styles/vars.css";

export const inputContainerStyle = style({
  padding: vars.space.sm,
  borderRadius: vars.borderRadius.xs,
});

export const inputFieldStyle = style({
  border: "none",
  background: "inherit",
  color: "inherit",
  ":focus": {
    outline: "none",
  },
  "::placeholder": {
    color: vars.color.text.gray2,
  },
});

export const inputIconStyle = style({
  background: vars.color.text.gray2,
  color: vars.color.background.level1,
});

const inputProperties = defineProperties({
  ...responsivePropertiesMixin,
  properties: {
    height: vars.dims.input,
  },
});

export const inputAtoms = createSprinkles(inputProperties);

export type InputAtoms = Parameters<typeof inputAtoms>[0];
