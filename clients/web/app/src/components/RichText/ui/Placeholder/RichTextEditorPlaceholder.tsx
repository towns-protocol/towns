import React from "react";
import { Box, Paragraph } from "@ui";

type Props = {
  placeholder: string;
};

export const RichTextPlaceholder = (props: Props) => (
  <Box position="absolute" pointerEvents="none" color="gray2" paddingY="md">
    <Paragraph>{props.placeholder}</Paragraph>
  </Box>
);
