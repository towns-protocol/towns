import React from "react";
import { MemoryRouter } from "react-router";
import { darkTheme, lightTheme } from "ui/styles/vars.css";
import { Box, BoxProps, Grid, Stack, Text } from "../ui/components";
import { crossClass } from "./Storybook.css";

export const Square = (props: BoxProps) => (
  <Box
    background="none"
    square="square_xs"
    className={!props.background ? crossClass : ""}
    {...props}
  />
);

export const GridItem = (props: { children?: React.ReactNode }) => (
  <Box borderBottom="strong" paddingY="md" justifyContent="center">
    {props.children}
  </Box>
);

export const Row = ({
  label,
  columns = 2,
  children,
  backgroundVariant,
  ...boxProps
}: {
  label: string;
  columns?: number;
  backgroundVariant?: "inverted" | "accent";
  tone?: boolean;
  children?: React.ReactNode;
} & BoxProps) => (
  <Grid borderBottom direction="row" paddingY="md" columns={columns ?? 2}>
    <Box grow justifyContent="center" key="first">
      <Text>{label}</Text>
    </Box>
    <Box
      grow
      justifyContent="center"
      key="last"
      background={backgroundVariant}
      padding={backgroundVariant && "sm"}
    >
      {children}
    </Box>
  </Grid>
);

export const StoryContainer = ({
  stacked,
  children,
}: {
  stacked?: boolean;
  children?: React.ReactNode;
}) => (
  <MemoryRouter>
    <Stack grow direction={stacked ? "column" : "row"} maxWidth="desktop">
      <Stack grow background="level1" padding="lg" className={lightTheme}>
        {children}
      </Stack>
      <Stack grow background="level1" padding="lg" className={darkTheme}>
        {children}
      </Stack>
    </Stack>
  </MemoryRouter>
);
