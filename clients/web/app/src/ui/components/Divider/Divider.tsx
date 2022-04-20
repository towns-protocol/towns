import React from "react";
import { Box, Paragraph } from "..";
import { ParagraphProps } from "../Text/Paragraph";

export const Divider = ({
  label,
  fontSize = "sm",
  align = "center",
}: {
  label?: string;
  fontSize?: ParagraphProps["size"];
  align?: "left" | "center" | "right";
}) =>
  !label ? (
    <Box gap="sm" direction="row" alignItems="center" width="100%">
      <Box borderBottom grow />
    </Box>
  ) : (
    <Box gap="sm" direction="row" alignItems="center">
      {align !== "left" && <Box borderBottom grow />}
      <Box>
        <Paragraph color="gray2" size={fontSize}>
          {label}
        </Paragraph>
      </Box>
      {align !== "right" && <Box borderBottom grow />}
    </Box>
  );
