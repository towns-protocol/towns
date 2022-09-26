import React, { useEffect } from "react";
import { Outlet, Route, Routes, useNavigate } from "react-router";
import useEvent from "react-use-event-hook";

import { ZionContextProvider, useMatrixStore } from "use-zion-client";
import { Box, Heading } from "@ui";
import { useRootTheme } from "hooks/useRootTheme";
import { FontLoader } from "ui/utils/FontLoader";
import { AppLayout } from "AppLayout";
import { SiteHome } from "routes/SiteHome";
import { Register } from "routes/Register";
import { SidebarLayout } from "SidebarLayout";
import { SpacesNew } from "routes/SpacesNew";

const SpaceRoutes = React.lazy(() => import("routes/SpaceRoutes"));
const Playground = React.lazy(() => import("@components/Playground"));

FontLoader.init();

const MATRIX_HOMESERVER_URL = "https://node1.zion.xyz";
const ZION_SPACE_ID = "!V2Gs6CLcXwOokgiq:node1.zion.xyz";
const ZION_SPACE_NAME = "Zion Preview"; // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
const ZION_SPACE_AVATAR_SRC = "/placeholders/nft_10.png"; // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188

export const App = () => {
  return (
    <ZionContextProvider
      disableEncryption // todo remove this when we support olm in the browser https://github.com/HereNotThere/harmony/issues/223
      homeServerUrl={MATRIX_HOMESERVER_URL}
      defaultSpaceId={ZION_SPACE_ID}
      defaultSpaceName={ZION_SPACE_NAME}
      defaultSpaceAvatarSrc={ZION_SPACE_AVATAR_SRC}
      initialSyncLimit={100}
    >
      <AllRoutes />
    </ZionContextProvider>
  );
};

const AllRoutes = () => {
  const { isAuthenticated } = useMatrixStore();
  useNavigateOnAuth("/", isAuthenticated);
  useRootTheme({
    ammendHTMLBody: true,
    useDefaultOSTheme: false,
  });
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/register" element={<Register />} />
        <Route element={<Outlet />}>
          <Route path="*" element={<SiteHome />} />
          <Route
            element={
              <Box grow centerContent>
                <Outlet />
              </Box>
            }
          >
            <Route path="/manifesto" element={<Heading>MANIFESTO</Heading>} />
            <Route path="/protocol" element={<Heading>PROTOCOL</Heading>} />
            <Route path="/dao" element={<Heading>DAO</Heading>} />
          </Route>
          {isAuthenticated && (
            <>
              <Route path="*" element={<SidebarLayout />}>
                <Route path="*" element={<SpaceRoutes />} />
              </Route>
              <Route path="spaces/new" element={<SpacesNew />} />
            </>
          )}
        </Route>
      </Route>
      <Route path="/playground" element={<Playground />} />
    </Routes>
  );
};

export default App;

const useNavigateOnAuth = (to: string, isAuthenticated: boolean) => {
  const navigate = useNavigate();
  const stableNavigate = useEvent(() => navigate(to));
  useEffect(() => {
    if (isAuthenticated) {
      stableNavigate();
    }
  }, [isAuthenticated, stableNavigate]);
};
