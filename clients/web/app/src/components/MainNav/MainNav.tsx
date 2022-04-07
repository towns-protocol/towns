import React from "react";
import { MainActions } from "@components/MainActions";
import { SpaceNavMock } from "@components/SpaceNavItem/SpaceNavItem";
import { Box } from "@ui";

export const MainNav = () => (
  <NavContainer>
    <MainActions />
    <SpaceNavMock />
  </NavContainer>
);

export const NavContainer: React.FC = (props) => (
  <Box
    borderRight
    grow="x0"
    shrink={{ tablet: "x0", desktop: "x1" }}
    basis={{ tablet: "auto", desktop: "300" }}
    background="level1"
    overflow="hidden"
    minWidth={{ tablet: "none", desktop: "auto" }}
  >
    {props.children}
  </Box>
);
