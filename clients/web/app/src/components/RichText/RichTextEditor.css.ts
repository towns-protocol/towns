import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";

export const contentEditable = style(
  {
    outline: "none",
  },
  "debug-contentEditable",
);

globalStyle(`${contentEditable} p + p, ${contentEditable} li + li`, {
  marginTop: vars.dims.baseline.x1,
});

globalStyle(`${contentEditable} ul`, {
  marginTop: vars.dims.baseline.x1,
});
