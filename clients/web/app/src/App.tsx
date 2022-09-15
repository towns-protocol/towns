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

const SpaceRoutes = React.lazy(() => import("routes/SpaceRoutes"));
const Playground = React.lazy(() => import("@components/Playground"));

FontLoader.init();

const MATRIX_HOMESERVER_URL = "https://node1.hntlabs.com";
const ZION_SPACE_ID = "!V2Gs6CLcXwOokgiq:node1.hntlabs.com";
const ZION_SPACE_NAME = "Zion Preview"; // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
const ZION_SPACE_AVATAR_SRC = "/placeholders/nft_10.png"; // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
const SPACE_MANAGER_ADDRESS = "0x5ee6615d52663131c938a43a280fccc4e9eee97a"; // on rinkeby
const USER_ENTITLEMENT_ADDRESS = "0x7eca4c7f6e4245b9994b5fdec445673c1bdc0a44"; // on rinkeby
const TOKEN_ENTITLEMENT_ADDRESS = ""; // for development on local blockchain - to be replaced with rinkeby address.
const COUNCIL_NFT_ADDRESS = "";
const COUNCIL_STAKING_ADDRESS = "";

export const App = () => {
  return (
    <ZionContextProvider
      disableEncryption // todo remove this when we support olm in the browser https://github.com/HereNotThere/harmony/issues/223
      homeServerUrl={MATRIX_HOMESERVER_URL}
      spaceManagerAddress={SPACE_MANAGER_ADDRESS}
      tokenEntitlementAddress={TOKEN_ENTITLEMENT_ADDRESS}
      userEntitlementAddress={USER_ENTITLEMENT_ADDRESS}
      councilNFTAddress={COUNCIL_NFT_ADDRESS}
      councilStakingAddress={COUNCIL_STAKING_ADDRESS}
      defaultSpaceId={ZION_SPACE_ID}
      defaultSpaceName={ZION_SPACE_NAME}
      defaultSpaceAvatarSrc={ZION_SPACE_AVATAR_SRC}
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
            <Route path="*" element={<SidebarLayout />}>
              <Route path="*" element={<SpaceRoutes />} />
            </Route>
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
