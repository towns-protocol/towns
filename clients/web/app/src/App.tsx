import { MainActions } from "@components/MainActions";
import { SpaceNavMock } from "@components/SpaceNavItem/SpaceNavItem";
import { TopBar } from "@components/TopNav";
import { Box } from "@ui";
import React, { useCallback, useState } from "react";
import { darkTheme, lightTheme } from "ui/styles/vars.css";
import { Home } from "views/Home";
import { Messages } from "views/Messages";

export type RouteId = "home" | "messages" | "new";

export const App = () => {
  const [route, setRoute] = useState<RouteId>("home");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const onSelectView = useCallback((id: RouteId) => {
    setRoute(id);
  }, []);

  const onToggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return (
    <Box
      className={theme === "light" ? lightTheme : darkTheme}
      background="default"
      color="default"
      grow
      absoluteFill
    >
      <TopBar onClick={onToggleTheme} />
      <Box direction="row" grow>
        <Box background="level1" borderRight shrink={false}>
          <MainActions selectedId={route} onSelect={onSelectView} />
          <SpaceNavMock />
        </Box>
        {route === "home" ? <Home /> : <Messages />}
      </Box>
    </Box>
  );
};
