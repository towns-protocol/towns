import React from "react";
import { Box, BoxProps } from "@ui";
import CardCss from "./Card.css";

type Props = {
  colSpan: 1 | 2 | 3 | 4;
} & BoxProps;

export const Card = ({ children, colSpan = 1, ...boxProps }: Props) => {
  return (
    <Box
      grow
      background="level3"
      borderRadius="md"
      className={CardCss}
      colSpan={{ mobile: 4, desktop: colSpan }}
      overflow="hidden"
      position="relative"
      {...boxProps}
    >
      {children}
    </Box>
  );
};
