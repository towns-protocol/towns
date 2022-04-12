import { style } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";

export const inputContainerStyle = style({
  height: vars.dims.inputs.md,
  padding: vars.space.xs,
  borderRadius: vars.borderRadius.xs,
  border: "none",
  background: vars.color.layer.level1,
  "::placeholder": {
    color: vars.color.text.gray2,
  },
});

export const inputFieldStyle = style({
  border: "none",
  background: vars.color.layer.level1,
  "::placeholder": {
    color: vars.color.text.gray2,
  },
});
