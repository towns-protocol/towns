import { style } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";

export const tooltip = style({
  filter: `drop-shadow(0px 0px 1px rgba(0, 0, 0, .25)) drop-shadow(2px 8px 6px rgba(0, 0, 0, .1))`,
  position: "relative",
});

export const arrowLeft = style({
  selectors: {
    "&:after": {
      content: "",
      display: "block",
      position: `absolute`,
      border: `7px solid`,
      borderColor: `transparent ${vars.color.background.level1} transparent transparent`,
      left: "0",
      top: "50%",
      transform: `translate(-100%, -50%)`,
    },
  },
});
