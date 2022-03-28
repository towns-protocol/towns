import { Box, BoxProps, Grid, Text } from "@ui";
import React from "react";

export const Square = (props: BoxProps) => (
  <Box background="transparent" square="md" {...props} />
);

export const GridItem = (props: { children?: React.ReactNode }) => (
  <Box borderBottom="regular" paddingY="sm" justifyContent="center">
    {props.children}
  </Box>
);

export const Row = (props: { label: string; children?: React.ReactNode }) => (
  <Grid direction="row" paddingY="sm" borderBottom="regular" columns={2}>
    <Box justifyContent="center">
      <Text>{props.label}</Text>
    </Box>
    <Box justifyContent="center">{props.children}</Box>
  </Grid>
);
