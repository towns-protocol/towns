import { Allotment, AllotmentHandle } from "allotment";
import React, { useEffect, useRef } from "react";
import { Outlet, useMatch, useNavigate } from "react-router";
import { useMatrixStore, useMyProfile, useSpace } from "use-matrix-client";
import {
  MainSideBar,
  MessagesSideBar,
  SpaceSideBar,
} from "@components/SideBars";
import { Box, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";
import { atoms } from "ui/styles/atoms.css";

export const SidebarLayout = () => {
  const allotemntRef = useRef<AllotmentHandle>(null);
  const messageRoute = useMatch({ path: "/messages", end: false });
  const spaceRoute = useMatch({ path: "/spaces/:spaceSlug", end: false });
  const homeRoute = useMatch({ path: "/home", end: true });
  const space = useSpace(spaceRoute?.params.spaceSlug);
  const myProfile = useMyProfile();
  const { userId } = useMatrixStore();
  const navigate = useNavigate();
  const config = ["primary-menu", "secondary-menu", "content"];
  const { onSizesChange, sizes } = usePersistPanes(config);

  const isSecondarySidebarActive = !!messageRoute;

  useEffect(() => {
    allotemntRef.current?.reset();
  }, [isSecondarySidebarActive]);

  useEffect(() => {
    // cheap and dirty onboarding check
    if (myProfile != null) {
      if (
        myProfile.displayName === userId ||
        myProfile.displayName === "" ||
        myProfile.avatarUrl === "" ||
        myProfile.avatarUrl === null
      ) {
        console.log("navigte to register for extra onboarding!!");
        navigate("/register");
      }
    }
  }, [myProfile, navigate, userId]);

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
            {space && !homeRoute ? (
              <SpaceSideBar space={space} />
            ) : (
              <MainSideBar />
            )}
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
