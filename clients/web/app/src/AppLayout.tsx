import React from "react";
import { Outlet } from "react-router-dom";
import { Stack } from "@ui";

export const AppLayout = () => {
  return (
    <Stack grow color="default" minHeight="100vh">
      <Outlet />
    </Stack>
  );
};
