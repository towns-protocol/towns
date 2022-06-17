import { style } from "@vanilla-extract/css";
import { atoms } from "ui/styles/atoms/atoms.css";

export const highlightInactive = atoms({
  rounded: "md",
});

export const highlightSelectedInactive = style({
  transform: `scale(0.95)`,
});

export const highlightActive = atoms({
  rounded: "xs",
  background: "level2",
});

export const highlightTransitionSwift = style({
  transition: `border-radius 320ms ease-out`,
});

export const highlightTransitionOut = style({
  transition: `all 320ms ease`,
});

export const highlightTransitionSelected = style({
  transition: `all 640ms ease 120ms`,
});
