import { globalStyle, style } from "@vanilla-extract/css";
import { createSprinkles } from "@vanilla-extract/sprinkles";
import { debugClass } from "../css/debug.css";
import "../css/globals.css";
import { blockProperties } from "./properties/blockProperties.css";
import { boxProperties } from "./properties/boxProperties.css";
import { colorProperties } from "./properties/colorProperties.css";
import { gridItemProperties } from "./properties/gridItemProperties.css";
import { typeProperties } from "./properties/textProperties.css";

export const atoms = createSprinkles(
  colorProperties,
  typeProperties,
  blockProperties,
  boxProperties,
  gridItemProperties,
);

export type Atoms = Parameters<typeof atoms>[0];

export const boxClass = style({}, "box");

globalStyle(`${debugClass}, ${debugClass} ${boxClass}`, {
  boxShadow: "0 0 0 1px #90f7",
});
