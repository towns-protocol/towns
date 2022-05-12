import React from "react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "AppLayout";
import { HomeIndex } from "routes/Home";
import { Messages } from "routes/Messages";
import { MessagesNew } from "routes/MessagesNew";
import { MessagesRead } from "routes/MessagesRead";
import { SpaceMentions } from "routes/SpaceMentions";
import { Spaces } from "routes/Spaces";
import { SpacesChannel } from "routes/SpacesChannel";
import { SpacesChannelReplies } from "routes/SpacesChannelThread";
import { SpacesIndex } from "routes/SpacesIndex";
import { SpacesNew } from "routes/SpacesNew";
import { SpaceThreads } from "routes/SpaceThreads";
import { FontLoader } from "ui/utils/FontLoader";
import { SpacesSettings } from "routes/SpacesSettings";
import { SpacesInvite } from "routes/SpacesInvite";

FontLoader.init();

export const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomeIndex />} />
        <Route path="/messages" element={<Messages />}>
          <Route path="new" element={<MessagesNew />} />
          <Route path=":conversationId" element={<MessagesRead />} />
        </Route>
        <Route path="/spaces/new" element={<SpacesNew />} />
        <Route path="/spaces/:spaceId" element={<Spaces />}>
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
    </Routes>
  );
};
