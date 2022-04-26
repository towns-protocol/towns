import React, { useCallback, useMemo, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { TopBar } from "@components/TopBar";
import { Stack } from "@ui";
import { Home } from "routes/Home";
import { Messages } from "routes/Messages";
import { MessagesNew } from "routes/MessagesNew";
import { MessagesRead } from "routes/MessagesRead";
import { SpaceMentions } from "routes/SpaceMentions";
import { Spaces } from "routes/Spaces";
import { SpacesChannel } from "routes/SpacesChannel";
import { SpacesChannelReplies } from "routes/SpacesChannelThread";
import { SpacesIndex } from "routes/SpacesIndex";
import { SpaceThreads } from "routes/SpaceThreads";
import { darkTheme, lightTheme } from "ui/styles/vars.css";

export const App = () => {
  const defaultDark = useMemo(
    () => !!window.matchMedia("(prefers-color-scheme: dark)").matches,
    []
  );
  const [theme, setTheme] = useState<"light" | "dark">(
    defaultDark ? "dark" : "light"
  );
  const onToggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return (
    <Stack
      grow
      absoluteFill
      className={theme === "light" ? lightTheme : darkTheme}
      background="default"
      color="default"
    >
      <TopBar onClick={onToggleTheme} />
      <Stack grow horizontal>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/messages" element={<Messages />}>
            <Route path="new" element={<MessagesNew />} />
            <Route path=":conversationId" element={<MessagesRead />} />
          </Route>
          <Route path="/spaces/:spaceId" element={<Spaces />}>
            <Route index element={<SpacesIndex />} />
            <Route path="threads" element={<SpaceThreads />} />
            <Route path="mentions" element={<SpaceMentions />} />
            <Route path=":channel" element={<SpacesChannel />}>
              <Route
                path="replies/:messageId"
                element={<SpacesChannelReplies />}
              />
            </Route>
          </Route>
        </Routes>
      </Stack>
    </Stack>
  );
};
