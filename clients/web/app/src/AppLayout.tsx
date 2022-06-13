import { AnimatePresence } from "framer-motion";
import React, { useRef } from "react";
import { Outlet } from "react-router-dom";
import { useSpaceDataListener } from "hooks/useSpaceDataListener";
import { Box, RootLayerContext, Stack } from "@ui";

export const AppLayout = (props: { authenticated: boolean }) => {
  useSpaceDataListener();
  const overlayRef = useRef<HTMLElement>(null);

  return (
    <RootLayerContext.Provider value={{ rootLayerRef: overlayRef }}>
      <Stack grow color="default" minHeight="100vh">
        <Outlet />
      </Stack>
      <Box>
        <AnimatePresence>
          <Box ref={overlayRef} zIndex="tooltips" />
        </AnimatePresence>
      </Box>
    </RootLayerContext.Provider>
  );
};
