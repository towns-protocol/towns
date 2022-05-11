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
import { Box, Stack, TopLayerPortalContext } from "@ui";
import { fakeSpaces } from "data/SpaceData";
import { usePersistPanes } from "hooks/usePersistPanes";
import { atoms } from "ui/styles/atoms/atoms.css";
import { Web3Bar } from "@components/Web3";

const MATRIX_HOMESERVER_URL = "http://localhost:8008";

export const AppLayout = () => {
  const overlayRef = useRef<HTMLElement>(null);

  return (
    <MatrixContextProvider homeServerUrl={MATRIX_HOMESERVER_URL}>
      <TopLayerPortalContext.Provider value={{ rootRef: overlayRef }}>
        <Stack grow border color="default" minHeight="100vh">
          <Web3Bar />
          <TopBar />
          <PaneContainer />
        </Stack>
        <Box>
          <AnimatePresence>
            <Box ref={overlayRef} />
          </AnimatePresence>
        </Box>
      </TopLayerPortalContext.Provider>
    </MatrixContextProvider>
  );
};

const PaneContainer = () => {
  const messageRoute = useMatch({ path: "/messages", end: false });
  const spaceRoute = useMatch({ path: "/spaces/:space", end: false });
  const space =
    spaceRoute && fakeSpaces.find((s) => s.id === spaceRoute.params.space);

  const { onSizesChange, sizes } = usePersistPanes("main");

  console.log(sizes);

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
          <Allotment.Pane snap minSize={65} maxSize={320}>
            {space ? <SpaceSideBar space={space} /> : <MainSideBar />}
          </Allotment.Pane>

          <Allotment.Pane
            snap
            minSize={65}
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
