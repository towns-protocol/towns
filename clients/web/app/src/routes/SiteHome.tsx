import React from "react";
import { NavLink } from "react-router-dom";
import { LoginComponent } from "@components/Login/LoginComponent";
import { Logo } from "@components/Logo";
import { Stack, Text } from "@ui";
import { atoms } from "ui/styles/atoms.css";

export const SiteHome = () => (
  <Stack centerContent grow height="100%" gap="lg">
    <NavLink to="/onboarding">
      <Logo className={atoms({ height: "x8" })} />
    </NavLink>
    <Text strong>
      <b>Connect your wallet to continue</b>
    </Text>
    <LoginComponent />
  </Stack>
);
