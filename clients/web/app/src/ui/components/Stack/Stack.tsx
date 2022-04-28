import React, { forwardRef } from "react";
import { Box } from "@ui";
import { BoxProps } from "../Box/Box";

type StackProps = {
  horizontal?: boolean;
  direction?: BoxProps["direction"];
  gap?: BoxProps["gap"];
} & BoxProps;

export const Stack = forwardRef<HTMLElement, StackProps>(
  ({ horizontal, ...boxProps }, ref) => (
    <Box
      ref={ref}
      direction={boxProps.direction ?? (horizontal ? "row" : "column")}
      {...boxProps}
    />
  )
);
