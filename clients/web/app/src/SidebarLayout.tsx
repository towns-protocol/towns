import { Allotment, AllotmentHandle } from "allotment";
import React, { useEffect, useRef } from "react";
import { Outlet, useMatch, useNavigate } from "react-router";
import { useMatrixStore, useMyProfile, useSpace } from "use-zion-client";
import useEvent from "react-use-event-hook";
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
  const config = ["spaces", "primary-menu", "secondary-menu", "content"];
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

  const isSpacesExpanded = sizes[0] > 120;

  const onExpandSpaces = useEvent(() => {
    const newSizes = [...sizes];

    newSizes[0] = isSpacesExpanded ? 65 : 320;
    onSizesChange(newSizes);
    setTimeout(() => {
      allotemntRef.current?.reset();
    }, 0);
  });

  return (
    <Stack horizontal grow position="relative">
      <Box absoluteFill>
        <Allotment
          // proportionalLayout
          ref={allotemntRef}
          className={atoms({ minHeight: "100%" })}
          onChange={onSizesChange}
        >
          {/* left-side side-bar goes here */}
          <Allotment.Pane
            minSize={65}
            maxSize={320}
            preferredSize={sizes[0] || 65}
          >
            <MainSideBar
              expanded={isSpacesExpanded}
              onExpandClick={onExpandSpaces}
            />
          </Allotment.Pane>

          {/* left-side side-bar goes here */}
          <Allotment.Pane
            minSize={180}
            maxSize={320}
            preferredSize={sizes[1] || 320}
          >
            {space && !homeRoute ? <SpaceSideBar space={space} /> : <></>}
          </Allotment.Pane>

          {/* secondary side bar */}
          <Allotment.Pane
            minSize={180}
            maxSize={320}
            visible={!!isSecondarySidebarActive}
            preferredSize={sizes[2] || 320}
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
