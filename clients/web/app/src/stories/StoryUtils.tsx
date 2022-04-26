import React from "react";
import { MemoryRouter } from "react-router";
import { darkTheme, lightTheme } from "ui/styles/vars.css";
import { Box, BoxProps, Grid, Stack, Text } from "../ui/components";
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
  backgroundVariant,
  ...boxProps
}: {
  label: string;
  columns?: number;
  backgroundVariant?: "inverted" | "accent";
  tone?: boolean;
  children?: React.ReactNode;
} & BoxProps) => (
  <Grid borderBottom direction="row" paddingY="sm" columns={columns ?? 2}>
    <Box grow justifyContent="center" key="first">
      <Text>{label}</Text>
    </Box>
    <Box
      grow
      justifyContent="center"
      key="last"
      background={backgroundVariant}
      padding={backgroundVariant && "xs"}
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
      <Stack grow background="level1" padding="md" className={lightTheme}>
        {children}
      </Stack>
      <Stack grow background="level1" padding="md" className={darkTheme}>
        {children}
      </Stack>
    </Stack>
  </MemoryRouter>
);
