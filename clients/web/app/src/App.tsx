import React, { useCallback, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { TopBar } from "@components/TopNav";
import { Box } from "@ui";
import { darkTheme, lightTheme } from "ui/styles/vars.css";
import { Home } from "views/Home";
import { Messages } from "views/Messages";
import { Spaces } from "views/Spaces";

export const App = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const onToggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return (
    <Box
      grow
      absoluteFill
      className={theme === "light" ? lightTheme : darkTheme}
      background="default"
      color="default"
    >
      <TopBar onClick={onToggleTheme} />
      <Box grow direction="row">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/spaces/:space" element={<Spaces />} />
        </Routes>
      </Box>
    </Box>
  );
};
