import { Box, BoxProps, Grid, Text } from "@ui";
import React from "react";
import { crossClass } from "./Storybook.css";

export const Square = (props: BoxProps) => (
  <Box
    background="transparent"
    square="md"
    className={!props.background ? crossClass : ""}
    {...props}
  />
);

export const GridItem = (props: { children?: React.ReactNode }) => (
  <Box borderBottom="regular" paddingY="sm" justifyContent="center">
    {props.children}
  </Box>
);

export const Row = (props: {
  label: string;
  columns?: number;
  children?: React.ReactNode;
}) => (
  <Grid
    direction="row"
    paddingY="sm"
    borderBottom="regular"
    columns={props.columns ?? 2}
  >
    <Box grow justifyContent="center" key="first">
      <Text>{props.label}</Text>
    </Box>
    <Box grow justifyContent="center" key="last">
      {props.children}
    </Box>
  </Grid>
);
