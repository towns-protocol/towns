import { globalStyle, style } from "@vanilla-extract/css";
import { atoms } from "ui/styles/atoms.css";
import { vars } from "ui/styles/vars.css";

export const contentEditable = style(
  {
    outline: "none",
  },
  "debug-contentEditable",
);

export const richTextEditorUI = atoms({
  paddingX: "md",
  paddingY: "paragraph",
});

globalStyle(`${contentEditable} p + p, ${contentEditable} li + li`, {
  marginTop: vars.dims.baseline.x1,
});

globalStyle(`${contentEditable} ul`, {
  marginTop: vars.dims.baseline.x1,
});

globalStyle(`${contentEditable} a`, {
  color: vars.color.foreground.accent,
});
