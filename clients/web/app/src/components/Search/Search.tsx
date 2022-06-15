import React from "react";
import { Box, TextField } from "@ui";

export const Search = () => {
  return (
    <Box shrink width="200">
      <TextField
        height="input_md"
        background="level3"
        icon="search"
        placeholder="Search..."
      />
    </Box>
  );
};
