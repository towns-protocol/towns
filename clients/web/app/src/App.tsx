import { MainActions } from "@components/MainActions";
import { SpaceNavMock } from "@components/SpaceNavItem/SpaceNavItem";
import { TopBar } from "@components/TopNav";
import { Box } from "@ui";
import React, { useState } from "react";
import { Home } from "views/Home";
import { Messages } from "views/Messages";

export const App = () => {
  const [route] = useState<"home" | "messages">("home");

  return (
    <Box grow absoluteFill>
      <TopBar />
      <Box direction="row" grow>
        <Box background="level1" borderRight shrink={false}>
          <MainActions />
          <SpaceNavMock />
        </Box>
        {route === "home" ? <Home /> : <Messages />}
      </Box>
    </Box>
  );
};
