import { style } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";

export const iconButton = style({
  cursor: "pointer",
  ":hover": {
    color: vars.color.foreground.default,
  },
});
