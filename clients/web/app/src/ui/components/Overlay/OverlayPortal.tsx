import React, { createContext } from "react";

export const TopLayerPortalContext = createContext<{
  rootRef?: React.RefObject<HTMLElement | null>;
}>({});
