import { Box, BoxProps } from "@ui";
import React, { forwardRef } from "react";

export const NavItem = forwardRef<HTMLElement, BoxProps>((props, ref) => (
  <Box
    direction="row"
    alignItems="center"
    paddingX="sm"
    gap="xs"
    minHeight="md"
    {...props}
    ref={ref}
  />
));
