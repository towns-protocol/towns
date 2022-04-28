import React from "react";
import { Stack } from "@ui";
import { StackProps } from "../Stack/Stack";
import * as styles from "./Card.css";

export const Card = ({ children, ...boxProps }: StackProps) => {
  return (
    <Stack
      background="level3"
      borderRadius="md"
      className={styles.base}
      overflow="hidden"
      position="relative"
      {...boxProps}
    >
      {children}
    </Stack>
  );
};
