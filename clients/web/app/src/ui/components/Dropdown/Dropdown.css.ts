import { style } from "@vanilla-extract/css";
import { vars } from "ui/styles/vars.css";

export const dropdown = style({
  color: "inherit",
  appearance: "none",
  backgroundImage: `
    linear-gradient(45deg, transparent 50%, ${vars.color.background.level4} 50%),
    linear-gradient(135deg, ${vars.color.background.level4} 50%, transparent 50%),
    linear-gradient(to right, ${vars.color.background.level4}, ${vars.color.background.level4})`,
  backgroundPosition: `
    calc(100% - 5px) 50%,
    calc(100% - 0px) 50%,
    calc(100% - ${vars.dims.square.square_md}) ${vars.space.sm}`,
  backgroundSize: `
    5px 5px,
    5px 5px,
    1px calc(100% - ${vars.space.sm} * 2)`,
  backgroundRepeat: `no-repeat`,
});
