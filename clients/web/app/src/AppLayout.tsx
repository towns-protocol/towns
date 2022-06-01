import { Allotment, AllotmentHandle } from "allotment";
import { AnimatePresence } from "framer-motion";
import React, { useEffect, useRef } from "react";
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
  const allotemntRef = useRef<AllotmentHandle>(null);
  const messageRoute = useMatch({ path: "/messages", end: false });
  const spaceRoute = useMatch({ path: "/spaces/:space", end: false });

  const { spaces } = useSpaceDataStore();
  const space =
    spaceRoute && spaces.find((s) => s.id === spaceRoute.params.space);

  const config = ["primary-menu", "secondary-menu", "content"];
  const { onSizesChange, sizes } = usePersistPanes(config);

  const isSecondarySidebarActive = !!messageRoute;
  useEffect(() => {
    allotemntRef.current?.reset();
  }, [isSecondarySidebarActive]);

  return (
    <Stack horizontal grow position="relative">
      <Box absoluteFill>
        <Allotment
          proportionalLayout
          ref={allotemntRef}
          className={atoms({ minHeight: "100%" })}
          onChange={onSizesChange}
        >
          {/* left-side side-bar goes here */}
          <Allotment.Pane
            minSize={65}
            maxSize={320}
            preferredSize={sizes[0] || 250}
          >
            {space ? <SpaceSideBar space={space} /> : <MainSideBar />}
          </Allotment.Pane>

          {/* secondary side bar */}
          <Allotment.Pane
            minSize={180}
            maxSize={320}
            visible={!!isSecondarySidebarActive}
            preferredSize={sizes[1] || 250}
          >
            <MessagesSideBar />
          </Allotment.Pane>

          {/* main container */}
          <Allotment.Pane>
            <Box absoluteFill overflowY="scroll">
              <Outlet />
            </Box>
          </Allotment.Pane>
        </Allotment>
      </Box>
    </Stack>
  );
};
