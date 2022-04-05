import React from "react";
import { Box, BoxProps, Grid, Text } from "../ui/components";
import { crossClass } from "./Storybook.css";

export const Square = (props: BoxProps) => (
  <Box
    background="none"
    square="xs"
    className={!props.background ? crossClass : ""}
    {...props}
  />
);

export const GridItem = (props: { children?: React.ReactNode }) => (
  <Box borderBottom="strong" paddingY="sm" justifyContent="center">
    {props.children}
  </Box>
);

export const Row = ({
  label,
  columns = 2,
  children,
  invert,
  ...boxProps
}: {
  label: string;
  columns?: number;
  invert?: boolean;
  children?: React.ReactNode;
} & BoxProps) => (
  <Grid
    direction="row"
    paddingY="sm"
    borderBottom="strong"
    columns={columns ?? 2}
  >
    <Box grow justifyContent="center" key="first">
      <Text>{label}</Text>
    </Box>
    <Box
      grow
      justifyContent="center"
      key="last"
      background={invert ? "accent" : undefined}
      padding={invert && "xs"}
    >
      {children}
    </Box>
  </Grid>
);
