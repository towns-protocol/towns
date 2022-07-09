import React from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { MatrixContextProvider, useMatrixStore } from "use-matrix-client";
import { HighlightsGrid } from "@components/Highlights/HighlightsGrid";
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

FontLoader.init();

export const MATRIX_HOMESERVER_URL = "https://node1.hntlabs.com";

export const App = () => {
  return (
    <MatrixContextProvider homeServerUrl={MATRIX_HOMESERVER_URL}>
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

  // useNavigateOnAuth("/onboarding", isAuthenticated);

  return (
    <Routes>
      <Route path="/playground" element={<Playground />} />
      <Route element={<AppLayout authenticated={isAuthenticated} />}>
        {isAuthenticated && (
          <Route path="/onboarding" element={<Onboarding />} />
        )}
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
              <Route element={<HomeLayout />}>
                <Route index element={<HighlightsGrid />} />
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
                  <Route index element={<HighlightsGrid />} />
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
              </Route>
            </Route>
          )}
        </Route>
      </Route>
    </Routes>
  );
};

// const useNavigateOnAuth = (to: string, isAuthenticated: boolean) => {
//   const navigate = useNavigate();
//   const stableNavigate = useEvent(() => navigate("/onboarding"));
//   useEffect(() => {
//     if (isAuthenticated) {
//       stableNavigate();
//     }
//   }, [isAuthenticated, stableNavigate]);
// };
