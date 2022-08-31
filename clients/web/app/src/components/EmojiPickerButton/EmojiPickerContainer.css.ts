import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";

export const emojiPickerClassName = style({});

globalStyle(`:root`, {
  vars: {
    [`--rgb-background`]: `34, 32, 38`,
    [`--color`]: `234, 32, 38`,
    [`--rgb-accent`]: `	31,	237,	138`,
  },
});

globalStyle("em-emoji-picker", {
  border: `1px solid ${vars.color.background.level3}`,
});

globalStyle("em-emoji-picker .bar", {
  display: "none",
});
