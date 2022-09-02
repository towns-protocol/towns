import React, { useEffect } from "react";
import { Outlet, Route, Routes, useNavigate } from "react-router";
import useEvent from "react-use-event-hook";
import { ZionContextProvider, useMatrixStore } from "use-zion-client";
import { Highlights } from "@components/Highlights/HomeHighlights";
import { MembersPage } from "@components/Members/MembersPage";
import { Playground } from "@components/Playground";
import { ProposalPage } from "@components/Proposals/ProposalPage";
import { Box, Heading } from "@ui";
import { AppLayout } from "AppLayout";
import { ChannelSettings } from "routes/ChannelSettings";
import { InvitesIndex } from "routes/InvitesIndex";
import { MeIndex } from "routes/MeIndex";
import { Messages } from "routes/Messages";
import { MessagesNew } from "routes/MessagesNew";
import { MessagesRead } from "routes/MessagesRead";
import { Register } from "routes/Register";
import { SiteHome } from "routes/SiteHome";
import { SpaceLayout } from "routes/SpaceLayout";
import { SpaceMentions } from "routes/SpaceMentions";
import { Spaces } from "routes/Spaces";
import { SpacesChannel } from "routes/SpacesChannel";
import { SpacesChannelReplies } from "routes/SpacesChannelThread";
import { SpacesInvite } from "routes/SpacesInvite";
import { SpacesNew } from "routes/SpacesNew";
import { SpacesNewChannel } from "routes/SpacesNewChannel";
import { SpacesSettings } from "routes/SpacesSettings";
import { SpaceThreads } from "routes/SpaceThreads";
import { SidebarLayout } from "SidebarLayout";
import { FontLoader } from "ui/utils/FontLoader";
import { useRootTheme } from "hooks/useRootTheme";

FontLoader.init();

const MATRIX_HOMESERVER_URL = "https://node1.hntlabs.com";
const ZION_SPACE_ID = "!V2Gs6CLcXwOokgiq:node1.hntlabs.com";
const ZION_SPACE_NAME = "Zion Preview"; // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
const ZION_SPACE_AVATAR_SRC = "/placeholders/nft_10.png"; // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
const SPACE_MANAGER_ADDRESS = "0x5ee6615d52663131c938a43a280fccc4e9eee97a"; // on rinkeby
const TOKEN_MODULE_ADDRESS = ""; // for development on local blockchain - to be replaced with rinkeby address.
const USER_MANAGER_ADDRESS = "0x7eca4c7f6e4245b9994b5fdec445673c1bdc0a44"; // on rinkeby
const COUNCIL_NFT_ADDRESS = "";
const COUNCIL_STAKING_ADDRESS = "";

export const App = () => {
  return (
    <ZionContextProvider
      disableEncryption // todo remove this when we support olm in the browser https://github.com/HereNotThere/harmony/issues/223
      homeServerUrl={MATRIX_HOMESERVER_URL}
      spaceManagerAddress={SPACE_MANAGER_ADDRESS}
      tokenModuleAddress={TOKEN_MODULE_ADDRESS}
      userModuleAddress={USER_MANAGER_ADDRESS}
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
      <Route path="/playground" element={<Playground />} />
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
            <Route element={<SidebarLayout />}>
              <Route element={<Spaces />}>
                <Route element={<SpaceLayout />}>
                  <Route index element={<Highlights />} />
                  <Route path="proposals" element={<ProposalPage />} />
                  <Route path="members" element={<MembersPage />} />
                </Route>
              </Route>
              <Route path="me" element={<MeIndex />} />
              <Route path="messages" element={<Messages />}>
                <Route path="new" element={<MessagesNew />} />
                <Route path=":conversationId" element={<MessagesRead />} />
              </Route>
              <Route path="invites/:inviteSlug" element={<Spaces />}>
                <Route index element={<InvitesIndex />} />
              </Route>
              <Route path="spaces/new" element={<SpacesNew />} />
              <Route path="spaces/:spaceSlug" element={<Spaces />}>
                <Route element={<SpaceLayout />}>
                  <Route index element={<Highlights />} />
                  <Route path="proposals" element={<ProposalPage />} />
                  <Route path="members" element={<MembersPage />} />
                </Route>
                <Route path="threads" element={<SpaceThreads />} />
                <Route path="mentions" element={<SpaceMentions />} />
                <Route path="settings" element={<SpacesSettings />} />
                <Route path="invite" element={<SpacesInvite />} />
                <Route path="channels/new" element={<SpacesNewChannel />} />

                <Route path="channels/:channelSlug" element={<SpacesChannel />}>
                  <Route
                    path="replies/:messageId"
                    element={<SpacesChannelReplies />}
                  />
                </Route>
                <Route
                  path="channels/:channelSlug/settings"
                  element={<ChannelSettings />}
                />
              </Route>
            </Route>
          )}
        </Route>
      </Route>
    </Routes>
  );
};

const useNavigateOnAuth = (to: string, isAuthenticated: boolean) => {
  const navigate = useNavigate();
  const stableNavigate = useEvent(() => navigate(to));
  useEffect(() => {
    if (isAuthenticated) {
      stableNavigate();
    }
  }, [isAuthenticated, stableNavigate]);
};
