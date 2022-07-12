import { style } from "@vanilla-extract/css";
import { createSprinkles } from "@vanilla-extract/sprinkles";
import { debugClass } from "./globals/debug.css";
import "./globals/globals.css";
import { blockProperties } from "./properties/blockProperties.css";
import { boxProperties } from "./properties/boxProperties.css";
import { colorProperties } from "./properties/colorProperties.css";
import { gridItemProperties } from "./properties/gridItemProperties.css";
import { typeProperties } from "./properties/textProperties.css";
import { imageProperties } from "./properties/imageProperties.css";

export const atoms = createSprinkles(
  colorProperties,
  typeProperties,
  blockProperties,
  boxProperties,
  gridItemProperties,
  imageProperties,
);

export type Atoms = Parameters<typeof atoms>[0];
export type AtomNames = keyof Atoms;

export const boxClass = style({
  selectors: {
    [`${debugClass} &`]: { boxShadow: "0 0 0 1px #90f7" },
  },
});

export const containerWithGapClass = style({});
