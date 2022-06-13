import React from "react";
import { Stack } from "@ui";
import { StackProps } from "../Stack/Stack";

export const Card = ({ children, ...boxProps }: StackProps) => {
  return (
    <Stack
      background="level2"
      borderRadius="md"
      overflow="hidden"
      position="relative"
      boxShadow="card"
      {...boxProps}
    >
      {children}
    </Stack>
  );
};
