import { Box, BoxProps } from "@ui";
import React from "react";
import CardCss from "./Card.css";

type Props = {
  colSpan: 1 | 2 | 3 | 4;
} & BoxProps;

export const Card = ({ children, colSpan = 1, ...boxProps }: Props) => {
  return (
    <Box
      grow
      position="relative"
      background="level3"
      colSpan={{ mobile: 4, desktop: colSpan }}
      borderRadius="md"
      overflow="hidden"
      className={CardCss}
      {...boxProps}
    >
      {children}
    </Box>
  );
};
