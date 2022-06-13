import React from "react";
import { Box, TextField } from "@ui";

export const Search = () => {
  return (
    <Box shrink width="200">
      <TextField
        noBorder
        height="input_md"
        background="level3"
        icon="search"
        placeholder="Search..."
      />
    </Box>
  );
};
