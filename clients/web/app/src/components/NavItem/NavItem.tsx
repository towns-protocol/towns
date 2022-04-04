import { Box, BoxProps } from "@ui";
import React, { forwardRef, HTMLAttributes } from "react";

export const NavItem = forwardRef<
  HTMLElement,
  BoxProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <Box
    cursor="pointer"
    direction="row"
    alignItems="center"
    paddingX="sm"
    gap="xs"
    minHeight="md"
    {...props}
    ref={ref}
  />
));
