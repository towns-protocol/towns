import React from "react";
import { Stack } from "@ui";

export const NavContainer = (props: { children?: React.ReactNode }) => (
  <Stack
    borderRight
    shrink={{ tablet: "x0", desktop: "x1" }}
    basis={{ tablet: "auto", desktop: "300" }}
    background="level1"
    overflow="hidden"
    minWidth={{ tablet: "none", desktop: "auto" }}
  >
    {props.children}
  </Stack>
);
