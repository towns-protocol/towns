import { style } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";

export const radioSelect = style({});

export const radio = style({
  cursor: "pointer",
  position: "relative",
  display: "flex",
  outline: "none",
  justifyContent: "center",
  alignItems: "center",
  appearance: "none",
  backgroundColor: vars.color.background.level3,
  width: vars.dims.input.input_sm,
  height: vars.dims.input.input_sm,
  borderRadius: "100%",
  selectors: {
    "&:after": {
      content: "",
      position: "absolute",
      display: "block",
      width: "50%",
      height: "50%",
      background: vars.color.foreground.default,
      borderRadius: "100%",
      opacity: 0,
    },
    "&:checked:after": {
      opacity: 1,
    },
    "&:checked": {
      backgroundColor: vars.color.background.level4,
    },
  },
});

export const hiddenRadio = style({
  appearance: "none",
  display: "none",
});

export const radioLabel = style({
  selectors: {
    [`${radio}:checked ~ &`]: {
      color: vars.color.foreground.default,
    },
  },
});
