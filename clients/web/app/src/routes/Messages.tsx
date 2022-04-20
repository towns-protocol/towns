import React from "react";
import { Outlet } from "react-router";
import { MainNav, NavContainer } from "@components/MainNav/MainNav";
import { MessageList } from "@components/MessageList";
import { Stack } from "@ui";

export const Messages = (props: { children?: React.ReactNode }) => (
  <>
    <MainNav />
    <Stack horizontal basis="1200">
      <NavContainer>
        <MessageList />
      </NavContainer>
      <Outlet />
    </Stack>
  </>
);
