import React, { createContext } from "react";

export const RootLayerContext = createContext<{
  rootLayerRef?: React.RefObject<HTMLElement | null>;
}>({});
