import { style } from "@vanilla-extract/css";
import { createSprinkles } from "@vanilla-extract/sprinkles";
import { iconProperties } from "ui/styles/atoms/properties/iconProperties.css";
import { vars } from "ui/styles/vars.css";

export const iconAtoms = createSprinkles(iconProperties);

export const iconBaseStyle = style({
  borderRadius: vars.borderRadius.sm,
});

export type IconAtoms = Parameters<typeof iconAtoms>[0];
