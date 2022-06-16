import React, { useEffect } from "react";
import { Outlet, Route, Routes, useNavigate } from "react-router-dom";
import useEvent from "react-use-event-hook";
import { MatrixContextProvider, useMatrixStore } from "use-matrix-client";
import { TopBar } from "@components/TopBar";
import { Box, Heading, Paragraph } from "@ui";
import { AppLayout } from "AppLayout";
import { useRootTheme } from "hooks/useRootTheme";
import { HomeIndex } from "routes/Home";
import { InvitesIndex } from "routes/InvitesIndex";
import { MeIndex } from "routes/MeIndex";
import { Messages } from "routes/Messages";
import { MessagesNew } from "routes/MessagesNew";
import { MessagesRead } from "routes/MessagesRead";
import { Onboarding } from "routes/Onboarding";
import { SiteHome } from "routes/SiteHome";
import { SpaceMentions } from "routes/SpaceMentions";
import { Spaces } from "routes/Spaces";
import { SpacesChannel } from "routes/SpacesChannel";
import { SpacesChannelReplies } from "routes/SpacesChannelThread";
import { SpacesIndex } from "routes/SpacesIndex";
import { SpacesInvite } from "routes/SpacesInvite";
import { SpacesNew } from "routes/SpacesNew";
import { SpacesSettings } from "routes/SpacesSettings";
import { SpaceThreads } from "routes/SpaceThreads";
import { SidebarLayout } from "SidebarLayout";
import { FontLoader } from "ui/utils/FontLoader";
import { HighlightsGrid } from "@components/Highlights/HighlightsGrid";

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

  useNavigateOnAuth("/onboarding", isAuthenticated);

  return (
    <Routes>
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
              <Route element={<HomeIndex />}>
                <Route index element={<HighlightsGrid />} />
                <Route
                  path="proposals"
                  element={
                    <Box centerContent grow>
                      <Paragraph>Proposals</Paragraph>
                    </Box>
                  }
                />
                <Route
                  path="members"
                  element={
                    <Box centerContent grow>
                      <Paragraph>Members</Paragraph>
                    </Box>
                  }
                />
              </Route>

              <Route path="me" element={<MeIndex />} />
              <Route path="messages" element={<Messages />}>
                <Route path="new" element={<MessagesNew />} />
                <Route path=":conversationId" element={<MessagesRead />} />
              </Route>
              <Route path="invites/:spaceId" element={<Spaces />}>
                <Route index element={<InvitesIndex />} />
              </Route>
              <Route path="spaces/new" element={<SpacesNew />} />
              <Route path="spaces/:spaceId" element={<Spaces />}>
                <Route index element={<SpacesIndex />} />
                <Route path="threads" element={<SpaceThreads />} />
                <Route path="mentions" element={<SpaceMentions />} />
                <Route path="settings" element={<SpacesSettings />} />
                <Route path="invite" element={<SpacesInvite />} />
                <Route path=":channel" element={<SpacesChannel />}>
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

const useNavigateOnAuth = (to: string, isAuthenticated: boolean) => {
  const navigate = useNavigate();
  const stableNavigate = useEvent(() => navigate("/onboarding"));
  useEffect(() => {
    if (isAuthenticated) {
      stableNavigate();
    }
  }, [isAuthenticated, stableNavigate]);
};
