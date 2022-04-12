import React from "react";
import { Box, Paragraph } from "../";

export const Separator = (props: { label?: string }) =>
  !props.label ? (
    <Box gap="sm" direction="row" alignItems="center" width="100%">
      <Box borderBottom grow />
    </Box>
  ) : (
    <Box gap="sm" direction="row" alignItems="center">
      <Box borderBottom grow />
      <Box>
        <Paragraph color="gray2" size="sm">
          {props.label}
        </Paragraph>
      </Box>
      <Box borderBottom grow />
    </Box>
  );
