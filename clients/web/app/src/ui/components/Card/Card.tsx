import React from "react";
import { Box, BoxProps } from "@ui";
import * as styles from "./Card.css";

export const Card = ({ children, ...boxProps }: BoxProps) => {
  return (
    <Box
      background="level3"
      borderRadius="md"
      className={styles.base}
      overflow="hidden"
      position="relative"
      {...boxProps}
    >
      {children}
    </Box>
  );
};
