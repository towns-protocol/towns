import React from "react";
import { Box, Paragraph } from "..";
import { BoxProps } from "../Box/Box";
import { ParagraphProps } from "../Text/Paragraph";

export const Divider = ({
  label,
  fontSize = "sm",
  align = "center",
  space = "none",
}: {
  label?: string;
  fontSize?: ParagraphProps["size"];
  align?: "left" | "center" | "right";
  space?: BoxProps["paddingY"];
}) =>
  !label ? (
    <Box
      gap="md"
      direction="row"
      alignItems="center"
      width="100%"
      paddingY={space}
    >
      <Box borderBottom grow />
    </Box>
  ) : (
    <Box gap="md" direction="row" alignItems="center" paddingY={space}>
      {align !== "left" && <Box borderBottom grow />}
      <Box>
        <Paragraph color="gray2" size={fontSize}>
          {label}
        </Paragraph>
      </Box>
      {align !== "right" && <Box borderBottom grow />}
    </Box>
  );
