import { createVar, style, styleVariants } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";
import { field } from "../Field.css";

const focusedOpacityVar = createVar();

export const hidden = style({
  opacity: 0,
});

export const outlineBase = style({
  transition: `opacity 120ms ease`,
  selectors: {
    [`${field}:focus ~ &`]: {
      opacity: focusedOpacityVar,
    },
    [`${field}:hover:not(:disabled) ~ &, ${field}:focus ~ &`]: {
      opacity: focusedOpacityVar,
    },
  },
});

export const outlines = styleVariants({
  focus: {
    vars: {
      [focusedOpacityVar]: "0.5",
    },
    opacity: 0,
    transition: `opacity 120ms ease`,
    boxShadow: ` 0 0 0 2px ${vars.color.foreground.etherum}`,
    selectors: {
      [`${field}:focus ~ &`]: {
        opacity: focusedOpacityVar,
      },
      [`${field}:hover ~ &`]: {
        opacity: focusedOpacityVar,
      },
    },
  },
  neutral: {
    vars: {
      [focusedOpacityVar]: "0",
    },
    boxShadow: `inset 0 0 0 1px ${vars.color.background.level3}`,
  },
  critical: {
    vars: {
      [focusedOpacityVar]: "0",
    },
    boxShadow: `inset 0 0 0 1px ${vars.color.foreground.critical}`,
  },
  positive: {
    vars: {
      [focusedOpacityVar]: "0",
    },
    boxShadow: `inset 0 0 0 1px ${vars.color.foreground.positive}`,
  },
});
