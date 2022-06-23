import React from "react";
import { Box, Heading, Stack, Text } from "@ui";
import { Logo } from "@components/Logo";

export const Everything = () => (
  <Box>
    {/* typography */}
    <Heading>Heading</Heading>
    <Heading level={1}>Heading 1</Heading>
    <Heading level={2}>Heading 2</Heading>
    <Heading level={3}>Heading 3</Heading>
    <Heading level={4}>Heading 4</Heading>
    <Stack horizontal>
      <Box>H1</Box>
      <Box>H2</Box>
    </Stack>
    <Stack direction="row">
      <Box>H1</Box>
      <Box>H2</Box>
    </Stack>
    <Stack direction="column">
      <Box color="accent" />
      <Box color="cta1" />
    </Stack>
    <Text>Text</Text>
    <Logo />
  </Box>
);
