import { Allotment } from "allotment";
import { AnimatePresence } from "framer-motion";
import React, { useRef } from "react";
import { Outlet, useMatch } from "react-router";
import { MatrixContextProvider } from "use-matrix-client";
import {
  MainSideBar,
  MessagesSideBar,
  SpaceSideBar,
} from "@components/SideBars";
import { TopBar } from "@components/TopBar";
import { Box, RootLayerContext, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";
import { useRootTheme } from "hooks/useRootTheme";
import { useSpaceDataListener } from "hooks/useSpaceDataListener";
import { useSpaceDataStore } from "store/spaceDataStore";
import { atoms } from "ui/styles/atoms/atoms.css";

const MATRIX_HOMESERVER_URL = "https://node1.hntlabs.com";

export const AppLayout = () => {
  useSpaceDataListener();
  const overlayRef = useRef<HTMLElement>(null);
  const { toggleTheme } = useRootTheme({
    ammendHTMLBody: true,
    useDefaultOSTheme: false,
  });

  return (
    <MatrixContextProvider homeServerUrl={MATRIX_HOMESERVER_URL}>
      <RootLayerContext.Provider value={{ rootLayerRef: overlayRef }}>
        <Stack grow border color="default" minHeight="100vh">
          <TopBar onToggleTheme={toggleTheme} />
          <PaneContainer />
        </Stack>
        <Box>
          <AnimatePresence>
            <Box ref={overlayRef} zIndex="tooltips" />
          </AnimatePresence>
        </Box>
      </RootLayerContext.Provider>
    </MatrixContextProvider>
  );
};

const PaneContainer = () => {
  const messageRoute = useMatch({ path: "/messages", end: false });
  const spaceRoute = useMatch({ path: "/spaces/:space", end: false });
  const { spaces } = useSpaceDataStore();
  const space =
    spaceRoute && spaces.find((s) => s.id === spaceRoute.params.space);

  const { onSizesChange, sizes } = usePersistPanes("main");

  return (
    <Stack horizontal grow position="relative">
      <Box absoluteFill>
        <Allotment
          proportionalLayout
          className={atoms({ minHeight: "100%" })}
          defaultSizes={sizes}
          onChange={onSizesChange}
        >
          {/* left-side side-bars goes here */}
          <Allotment.Pane snap minSize={65} maxSize={320} preferredSize="250px">
            {space ? <SpaceSideBar space={space} /> : <MainSideBar />}
          </Allotment.Pane>

          <Allotment.Pane
            preferredSize="250px"
            minSize={messageRoute ? 65 : 0}
            maxSize={320}
            visible={!!messageRoute}
          >
            {messageRoute && <MessagesSideBar />}
          </Allotment.Pane>

          {/* main container */}
          <Box absoluteFill overflowY="scroll">
            <Outlet />
          </Box>
        </Allotment>
      </Box>
    </Stack>
  );
};
