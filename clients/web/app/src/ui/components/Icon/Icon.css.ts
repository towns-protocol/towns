import { style } from "@vanilla-extract/css";
import { createSprinkles } from "@vanilla-extract/sprinkles";
import { vars } from "ui/styles/vars.css";
import { iconProperties } from "./iconProperties.css";

export const iconAtoms = createSprinkles(iconProperties);

export const iconBaseStyle = style({
  borderRadius: vars.borderRadius.sm,
  WebkitMaskImage: `url(/squircle.svg)`,
  WebkitMaskSize: `cover`,
});

export type IconAtoms = Parameters<typeof iconAtoms>[0];
