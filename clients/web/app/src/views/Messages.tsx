import React from "react";
import { Outlet } from "react-router";
import { MainNav, NavContainer } from "@components/MainNav/MainNav";
import { MessageList } from "@components/MessageList";
import { Box } from "@ui";

export const Messages = (props: { children?: React.ReactNode }) => (
  <>
    <MainNav />
    <NavContainer>
      <MessageList />
    </NavContainer>
    <Box grow="x9">
      <Outlet />
    </Box>
  </>
);
