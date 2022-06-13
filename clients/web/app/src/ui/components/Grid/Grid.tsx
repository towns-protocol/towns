import React from "react";
import { vars } from "ui/styles/vars.css";
import { Box, BoxProps } from "../Box/Box";

type Props = BoxProps & {
  columns?: number;
  columnMinSize?: string;
  columnMaxSize?: string;
};

export const Grid = (props: Props) => {
  const {
    columns,
    columnMinSize,
    columnMaxSize = "1fr",
    children,
    ...boxProps
  } = props;

  return (
    <Box
      display="grid"
      style={{
        columnGap: vars.space.md,
        rowGap: vars.space.md,
        gridTemplateColumns: columns
          ? `repeat(${columns}, 1fr)`
          : `repeat(auto-fill,minmax(${columnMinSize}, ${columnMaxSize}))`,
      }}
      {...boxProps}
    >
      {children}
    </Box>
  );
};
