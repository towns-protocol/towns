import React from 'react'
import { Route, Routes } from 'react-router'
import { MembersPage } from '@components/Members/MembersPage'
import { ProposalPage } from '@components/Proposals/ProposalPage'
import { ChannelSettings } from './ChannelSettings'
import { InvitesIndex } from './InvitesIndex'
import { MeIndex } from './MeIndex'
import { SpaceHome } from './SpaceHome'
import { HomeHighlights } from './SpaceHomeHilights'
import { SpaceMentions } from './SpaceMentions'
import { SpacesChannel, SpacesChannelRoute } from './SpacesChannel'
import { SpacesChannelReplies } from './SpacesChannelReplies'
import { SpacesInvite } from './SpacesInvite'
import { SpacesNewChannel } from './SpacesNewChannel'
import { SpacesSettings } from './SpacesSettings'
import { SpaceThreadsInbox } from './SpaceThreadInbox'
import { SpaceThreads } from './SpaceThreads'
import { SpaceThreadInboxChannel } from './SpaceThreadInboxChannel'

const USE_THREAD_GROUPS = false

export const SpaceRoutes = () => (
    <Routes>
        <Route element={<SpaceHome />}>
            <Route index element={<HomeHighlights />} />
            <Route path="proposals" element={<ProposalPage />} />
            <Route path="members" element={<MembersPage />} />
        </Route>
        <Route path="me" element={<MeIndex />} />
        <Route path="invites/:inviteSlug">
            <Route index element={<InvitesIndex />} />
        </Route>

        <Route path="spaces/:spaceSlug">
            <Route element={<SpaceHome />}>
                <Route index element={<HomeHighlights />} />
                <Route path="proposals" element={<ProposalPage />} />
                <Route path="members" element={<MembersPage />} />
            </Route>
            <Route
                path="threads"
                element={USE_THREAD_GROUPS ? <SpaceThreads /> : <SpaceThreadsInbox />}
            >
                <Route path=":channelId" element={<SpaceThreadInboxChannel />}>
                    <Route path=":messageId" element={<SpacesChannelReplies />} />
                </Route>
            </Route>
            <Route path="mentions" element={<SpaceMentions />} />
            <Route path="settings" element={<SpacesSettings />} />
            <Route path="invite" element={<SpacesInvite />} />
            <Route path="channels/new" element={<SpacesNewChannel />} />
            <Route path="channels/:channelSlug" element={<SpacesChannel />}>
                <Route
                    path="replies/:messageId"
                    element={<SpacesChannelReplies parentRoute=".." />}
                />
            </Route>
            <Route element={<SpacesChannelRoute />}>
                <Route path="channels/:channelSlug/settings" element={<ChannelSettings />} />
            </Route>
        </Route>
    </Routes>
)

export default SpaceRoutes
