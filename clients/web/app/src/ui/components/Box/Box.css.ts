import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "ui/styles/vars.css";
import "../../styles/globals.css";

const flexDirection = {
  row: "row",
  column: "column",
} as const;

const border = {
  regular: `1px solid rgba(0 ,40, 80, 0.1)`,
  thin: `0.5px solid  rgba(0, 40, 80, 0.1)`,
  thick: `2px solid  rgba(0, 40, 80, 0.1)`,
} as const;

const aspectRatio = {
  square: "1",
};

const flexAlignment = ["flex-start", "center", "flex-end", "stretch"] as const;

const nonResponsiveProperties = defineProperties({
  properties: {
    display: ["block", "flex", "grid", "inline-block", "none", "contents"],
    aspectRatio: aspectRatio,
    flexDirection: flexDirection,
    flexWrap: ["wrap", "nowrap"],
    flexGrow: vars.flexGrow,
    flexShrink: vars.flexGrow,
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
    borderLeft: border,
    borderRight: border,
    borderTop: border,
    borderBottom: border,
    background: vars.color.background,
    color: vars.color.text,
    alignItems: [...flexAlignment, "baseline"],
    alignSelf: [...flexAlignment, "baseline"],
    justifyContent: [...flexAlignment, "space-around", "space-between"],
    justifySelf: flexAlignment,
    borderRadius: vars.borderRadius,
  },
  shorthands: {
    direction: ["flexDirection"],
    paddingX: ["paddingLeft", "paddingRight"],
    paddingY: ["paddingTop", "paddingBottom"],
    padding: ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"],
    square: ["width", "height"],
    border: ["borderBottom"],
  },
});

export const sprinkles = createSprinkles(nonResponsiveProperties);
export type Sprinkles = Parameters<typeof sprinkles>[0];
