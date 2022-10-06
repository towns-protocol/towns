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
    gap = "md",
    ...boxProps
  } = props;

  const columnGap =
    typeof gap === "string" ? gap : gap === true ? "md" : "none";

  const rowGap = typeof gap === "string" ? gap : gap === true ? "md" : "none";

  return (
    <Box
      display="grid"
      style={{
        columnGap: vars.space[columnGap],
        rowGap: vars.space[rowGap],
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
