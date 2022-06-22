import React from "react";
import { Box, Heading, Stack } from "@ui";
import { atoms } from "ui/styles/atoms.css";

export const Playground = () => {
  console.log(atoms.properties);
  return (
    <Box padding border centerContent height="100vh">
      <Stack border grow gap padding>
        <Heading>LINE</Heading>
        <Heading>LINE</Heading>
        <Box position="relative" width="200">
          <Box absoluteFill aspectRatio="1/1" background="accent" />
        </Box>
      </Stack>
    </Box>
  );
};
