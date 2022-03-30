import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "ui/styles/vars.css";
import "../../styles/globals.css";

const flexDirection = {
  row: "row",
  column: "column",
} as const;

const border = {
  regular: `1px solid`,
  thin: `0.5px solid`,
  thick: `2px solid`,
} as const;

const aspectRatio = {
  square: "1",
  "4/3": "4 / 3",
  "16/9": "16 / 9",
  "2/1": "2 / 1",
  "3/1": "3 / 1",
};

export const flexAlignment = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
} as const;

export const flexJustifyAlignment = {
  ...flexAlignment,
  spaceAround: "space-around",
  spaceBetween: "space-between",
} as const;

const flexGrow = {
  x0: 0,
  x1: 1,
  x2: 2,
  x3: 3,
  x4: 4,
  x5: 5,
  x6: 6,
  x7: 7,
  x8: 8,
  x9: 9,
} as const;

const nonResponsiveProperties = defineProperties({
  properties: {
    display: ["block", "flex", "grid", "inline-block", "none", "contents"],
    aspectRatio: aspectRatio,
    flexDirection: flexDirection,
    flexWrap: ["wrap", "nowrap"],
    flexGrow: flexGrow,
    flexShrink: flexGrow,
    gap: vars.space,
    paddingLeft: vars.space,
    paddingRight: vars.space,
    paddingTop: vars.space,
    paddingBottom: vars.space,
    height: vars.dims,
    minHeight: vars.dims,
    maxHeight: vars.dims,
    width: vars.dims,
    minWidth: vars.dims,
    maxWidth: vars.dims,
    borderColor: vars.color.text,
    borderLeft: border,
    borderRight: border,
    borderTop: border,
    borderBottom: border,
    background: vars.color.background,
    color: vars.color.text,
    alignItems: { ...flexAlignment, baseline: "baseline" },
    alignSelf: { ...flexAlignment, baseline: "baseline" },
    justifyContent: flexJustifyAlignment,
    justifySelf: flexAlignment,
    borderRadius: vars.borderRadius,
  },
  shorthands: {
    direction: ["flexDirection"],
    paddingX: ["paddingLeft", "paddingRight"],
    paddingY: ["paddingTop", "paddingBottom"],
    padding: ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"],
    square: ["width", "height"],
    border: ["borderLeft", "borderRight", "borderTop", "borderBottom"],
  },
});

export const sprinkles = createSprinkles(nonResponsiveProperties);

export type Sprinkles = Parameters<typeof sprinkles>[0];
