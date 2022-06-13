import React from "react";
import { MemoryRouter } from "react-router-dom";
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

const themes = [lightTheme, darkTheme];

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
  background = "level2",
  children,
  ...boxProps
}: {
  background?: BoxProps["background"];
  stacked?: boolean;

  children?: React.ReactNode;
}) => (
  <MemoryRouter>
    <Stack
      grow
      boxShadow="card"
      direction={stacked ? "column" : "row"}
      maxWidth="desktop"
    >
      {themes.map((theme) => (
        <Stack
          grow
          key={theme}
          padding="md"
          className={theme}
          background="default"
          color="default"
        >
          {background && (background as string).match(/overlay|tone/) ? (
            <Box centerContent grow background="inverted" padding="md">
              <Box
                centerContent
                grow
                background={background}
                padding="md"
                {...boxProps}
              >
                {children}
              </Box>
            </Box>
          ) : (
            <Box
              centerContent
              background={background}
              padding="md"
              {...boxProps}
            >
              {children}
            </Box>
          )}
        </Stack>
      ))}
    </Stack>
  </MemoryRouter>
);
