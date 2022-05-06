import React from "react";
import { Box, ButtonText, Stack } from "@ui";

type Props = {
  children?: React.ReactNode;
  title?: string;
  before?: JSX.Element;
  after?: JSX.Element;
};
export const ContextBar = (props: Props) => (
  <Stack
    borderBottom
    horizontal
    paddingX="md"
    height="height_xl"
    gap="sm"
    alignItems="center"
    justifyContent="spaceBetween"
  >
    {props.before}
    {props.title ? <ButtonText>{props.title}</ButtonText> : props.children}
    {props.after ? props.after : <Box grow />}
  </Stack>
);
