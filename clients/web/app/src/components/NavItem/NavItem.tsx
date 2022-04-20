import React, { HTMLAttributes, forwardRef } from "react";
import { Box, BoxProps } from "@ui";

export const NavItem = forwardRef<
  HTMLElement,
  { compact?: boolean } & BoxProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <Box
    direction="row"
    alignItems="center"
    paddingX="sm"
    paddingY={props.compact ? "xxs" : "xs"}
    gap={props.compact ? "xxs" : "xs"}
    minHeight={props.compact ? "sm" : "md"}
    {...props}
    ref={ref}
  />
));
