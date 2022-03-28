import React from "react";
import { Box, BoxProps } from "../Box/Box";

type Props = BoxProps & { columns: number };

export const Grid = (props: Props) => {
  const { children, columns, ...boxProps } = props;
  return (
    <Box
      display="grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      {...boxProps}
    >
      {children}
    </Box>
  );
};
