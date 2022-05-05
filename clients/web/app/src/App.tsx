import { AnimatePresence } from "framer-motion";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import clsx from "clsx";
import { Box, Stack } from "@ui";
import { TopBar } from "@components/TopBar";
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
import { TopLayerPortalContext } from "ui/components/Overlay/OverlayPortal";
import { darkTheme, lightTheme } from "ui/styles/vars.css";
import { FontLoader } from "ui/utils/FontLoader";

FontLoader.init();

export const App = () => {
  const defaultDark = useMemo(
    () => false && !!window.matchMedia("(prefers-color-scheme: dark)").matches,
    []
  );
  const [theme, setTheme] = useState<"light" | "dark">(
    defaultDark ? "dark" : "light"
  );
  const onToggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  const ref = useRef<HTMLElement>(null);

  return (
    <TopLayerPortalContext.Provider value={{ rootRef: ref }}>
      <Stack
        grow
        absoluteFill
        className={clsx([
          theme === "light" ? lightTheme : darkTheme,
          { [`debug-grid`]: false },
        ])}
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
        <Box>
          <AnimatePresence>
            <Box ref={ref} />
          </AnimatePresence>
        </Box>
      </Stack>
    </TopLayerPortalContext.Provider>
  );
};
