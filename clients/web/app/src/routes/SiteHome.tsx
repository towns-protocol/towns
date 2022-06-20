import React from "react";
import { NavLink } from "react-router-dom";
import { Box, Paragraph } from "@ui";
import { Logo } from "@components/Logo";
import { atoms } from "ui/styles/atoms.css";

export const SiteHome = () => (
  <Box centerContent grow height="100%" gap="md">
    <NavLink to="/onboarding">
      <Logo className={atoms({ height: "x8" })} />
    </NavLink>
    <Paragraph color="gray1">Coming Soon</Paragraph>
  </Box>
);
