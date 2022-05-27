import React from "react";
import { Box, TextField } from "@ui";

export const Search = () => {
  return (
    <Box>
      <TextField
        noBorder
        height="input_md"
        width="300"
        background="level2"
        icon="search"
        placeholder="Search..."
      />
    </Box>
  );
};
