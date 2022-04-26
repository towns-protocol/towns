import React from "react";
import { Outlet } from "react-router";
import { MessagesSideBar } from "@components/SideBars";
import { MainSideBar } from "@components/SideBars/MainSideBar";
import { Stack } from "@ui";

export const Messages = (props: { children?: React.ReactNode }) => (
  <>
    <MainSideBar />
    <Stack horizontal grow basis="1200">
      <MessagesSideBar />
      <Outlet />
    </Stack>
  </>
);
