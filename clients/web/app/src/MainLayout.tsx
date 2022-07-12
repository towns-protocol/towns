import { AnimatePresence } from "framer-motion";
import React, { useRef } from "react";
import { Box, RootLayerContext } from "@ui";

export const MainLayout = (props: { children: React.ReactNode }) => {
  const rootLayerRef = useRef<HTMLElement>(null);
  return (
    <RootLayerContext.Provider value={{ rootLayerRef }}>
      {props.children}
      <Box>
        <AnimatePresence>
          <Box ref={rootLayerRef} zIndex="tooltips" />
        </AnimatePresence>
      </Box>
    </RootLayerContext.Provider>
  );
};
