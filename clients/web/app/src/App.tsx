import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { Outlet, Route, Routes } from "react-router-dom";
import useEvent from "react-use-event-hook";
import { MatrixContextProvider, useMatrixStore } from "use-matrix-client";
import { Highlights } from "@components/Highlights/HomeHighlights";
import { MembersPage } from "@components/Members/MembersPage";
import { Playground } from "@components/Playground";
import { ProposalPage } from "@components/Proposals/ProposalPage";
import { TopBar } from "@components/TopBar";
import { Box, Heading } from "@ui";
import { AppLayout } from "AppLayout";
import { useRootTheme } from "hooks/useRootTheme";
import { HomeLayout } from "routes/HomeLayout";
import { InvitesIndex } from "routes/InvitesIndex";
import { MeIndex } from "routes/MeIndex";
import { Messages } from "routes/Messages";
import { MessagesNew } from "routes/MessagesNew";
import { MessagesRead } from "routes/MessagesRead";
import { Onboarding } from "routes/Onboarding";
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
import { SpaceHome } from "routes/SpaceHome";
import { ChannelSettings } from "routes/ChannelSettings";

FontLoader.init();

export const MATRIX_HOMESERVER_URL = "https://node1.hntlabs.com";
export const ZION_SPACE_ID = "!V2Gs6CLcXwOokgiq:node1.hntlabs.com";
export const ZION_SPACE_NAME = "Zion Preview"; // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
export const ZION_SPACE_AVATAR_SRC = "/placeholders/nft_10.png"; // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188

export const App = () => {
  return (
    <MatrixContextProvider
      disableEncryption // todo remove this when we support olm in the browser https://github.com/HereNotThere/harmony/issues/223
      homeServerUrl={MATRIX_HOMESERVER_URL}
      defaultSpaceId={ZION_SPACE_ID}
      defaultSpaceName={ZION_SPACE_NAME}
      defaultSpaceAvatarSrc={ZION_SPACE_AVATAR_SRC}
    >
      <AllRoutes />
    </MatrixContextProvider>
  );
};

const AllRoutes = () => {
  const { isAuthenticated, userId, username } = useMatrixStore();

  const { toggleTheme } = useRootTheme({
    ammendHTMLBody: true,
    useDefaultOSTheme: false,
  });

  useNavigateOnAuth("/", isAuthenticated);

  return (
    <Routes>
      <Route path="/playground" element={<Playground />} />
      <Route element={<AppLayout />}>
        <Route path="/register" element={<Onboarding />} />
        <Route
          element={
            <>
              <TopBar
                authenticated={isAuthenticated}
                userId={userId}
                username={username}
                onToggleTheme={toggleTheme}
              />
              <Outlet />
            </>
          }
        >
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
                <Route index element={<SpaceHome />} />
              </Route>
              <Route path="home" element={<HomeLayout />}>
                <Route index element={<Highlights />} />
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
                <Route index element={<SpaceHome />} />
                <Route element={<SpaceLayout />}>
                  <Route path="highlights" element={<Highlights />} />
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
