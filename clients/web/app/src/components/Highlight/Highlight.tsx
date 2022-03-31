import { Box, BoxProps } from "@ui";
import React from "react";

type Props = {
  span?: number;
  cover?: boolean;
} & BoxProps;

export const Highlight = ({ span = 1, cover, children, ...props }: Props) => {
  return (
    <Box
      grow
      background="level3"
      style={{ gridColumn: `span ${span}`, minHeight: "10vh" }}
      borderRadius="md"
      boxShadow="card"
      overflow="hidden"
      aspectRatio={cover ? "16/9" : "3/4"}
    >
      {cover ? (
        <>
          <Box background="level2" grow></Box>
        </>
      ) : (
        <>
          <Box background="level2" grow></Box>
          <Box background="level1" grow></Box>
        </>
      )}
    </Box>
  );
};
