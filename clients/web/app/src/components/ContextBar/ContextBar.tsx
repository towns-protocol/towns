import React from "react";
import { Box, Paragraph, Stack } from "@ui";

type Props = {
  children?: React.ReactNode;
  compact?: boolean;
  title?: string;
  before?: JSX.Element;
  after?: JSX.Element;
};
export const ContextBar = (props: Props) => (
  <Stack
    borderBottom
    horizontal
    paddingX="md"
    height={props.compact ? "x5" : "x7"}
    gap="md"
    alignItems="center"
    justifyContent="spaceBetween"
  >
    {props.before}
    {props.title ? <Paragraph>{props.title}</Paragraph> : props.children}
    {props.after ? props.after : <Box grow />}
  </Stack>
);
