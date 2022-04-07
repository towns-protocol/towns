import React, { HTMLAttributes, forwardRef } from "react";
import { Box, BoxProps } from "@ui";

export const NavItem = forwardRef<
  HTMLElement,
  BoxProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <Box
    cursor="pointer"
    direction="row"
    alignItems="center"
    paddingX="sm"
    paddingY={{ tablet: "xs", desktop: "xxs" }}
    gap="xs"
    minHeight="md"
    {...props}
    ref={ref}
  />
));
