import React from "react";
import { BoxProps, Stack } from "@ui";

type Props = BoxProps;

export const NavContainer = (props: Props) => (
  <Stack
    borderRight
    shrink={{ tablet: "x0", desktop: "x1" }}
    basis={{ tablet: "auto", desktop: "300" }}
    background="level1"
    overflow="hidden"
    minWidth={{ tablet: "none", desktop: "auto" }}
    {...props}
  />
);
