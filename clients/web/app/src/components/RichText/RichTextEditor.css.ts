import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";

export const contentEditable = style(
  {
    outline: "none",
  },
  "debug-contentEditable",
);

export const richTextEditorUI = style({
  padding: vars.dims.baseline.x3,
});

globalStyle(`${contentEditable} p + p, ${contentEditable} li + li`, {
  marginTop: vars.dims.baseline.x1,
});

globalStyle(`${contentEditable} ul`, {
  marginTop: vars.dims.baseline.x1,
});
