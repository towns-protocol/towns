import { styleVariants } from "@vanilla-extract/css";

export const iconSize = styleVariants({
  sm: {
    width: 16,
    height: 16,
  },
  md: {
    width: 20,
    height: 20,
  },
});

export type IconSizeVariants = keyof typeof iconSize;
