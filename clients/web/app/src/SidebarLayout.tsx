import { Allotment, AllotmentHandle } from "allotment";
import React, { useEffect, useRef } from "react";
import { Outlet, useMatch } from "react-router";
import {
  MainSideBar,
  MessagesSideBar,
  SpaceSideBar,
} from "@components/SideBars";
import { Box, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";
import { atoms } from "ui/styles/atoms.css";
import { useSpaceData } from "hooks/useSpaceData";

export const SidebarLayout = () => {
  const allotemntRef = useRef<AllotmentHandle>(null);
  const messageRoute = useMatch({ path: "/messages", end: false });
  const spaceRoute = useMatch({ path: "/spaces/:spaceSlug", end: false });
  const space = useSpaceData(spaceRoute?.params.spaceSlug);

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
            minSize={190}
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
