import React from "react";
import { Box } from "@ui";
import { BoxProps } from "../Box/Box";

type StackProps = {
  horizontal?: boolean;
  direction?: BoxProps["direction"];
  gap?: BoxProps["gap"];
} & BoxProps;

export const Stack = ({ horizontal, ...boxProps }: StackProps) => (
  <Box
    direction={boxProps.direction ?? (horizontal ? "row" : "column")}
    {...boxProps}
  />
);
