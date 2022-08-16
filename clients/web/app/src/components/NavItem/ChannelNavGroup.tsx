import React from "react";
import { Box, Paragraph } from "@ui";

export const ChannelNavGroup = (props: { children: React.ReactNode }) => (
  <Box paddingX="md" height="height_lg" paddingY="sm" justifyContent="end">
    <Paragraph color="gray2" textTransform="uppercase">
      {props.children}
    </Paragraph>
  </Box>
);
