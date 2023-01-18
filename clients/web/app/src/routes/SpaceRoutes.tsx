import React from 'react'
import { Route, Routes } from 'react-router'
import { MembersPage } from '@components/Members/MembersPage'
import { ProposalPage } from '@components/Proposals/ProposalPage'
import { PATHS } from 'routes'
import { ChannelSettings } from './ChannelSettings'
import { InvitesIndex } from './InvitesIndex'
import { MeIndex } from './MeIndex'
import { SpaceCreate } from './SpaceCreate'
import { SpaceGettingStarted } from './SpaceGettingStarted'
import { SpaceHome } from './SpaceHome'
import { HomeHighlights } from './SpaceHomeHilights'
import { SpaceMentions } from './SpaceMentions'
import { SpacesChannel, SpacesChannelRoute } from './SpacesChannel'
import { SpacesChannelReplies } from './SpacesChannelReplies'
import { SpacesInvite } from './SpacesInvite'
import { SpacesNew } from './SpacesNew'
import { SpacesSettings } from './SpacesSettings'
import { SpaceThreads } from './SpaceThreads'

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
        <Route path="spaces/new" element={<SpacesNew />} />
        <Route path="spaces/create" element={<SpaceCreate />} />
        <Route path="spaces/:spaceSlug">
            <Route element={<SpaceHome />}>
                <Route index element={<HomeHighlights />} />
                <Route path="proposals" element={<ProposalPage />} />
                <Route path="members" element={<MembersPage />} />
            </Route>
            <Route path="threads" element={<SpaceThreads />} />
            <Route path="mentions" element={<SpaceMentions />} />
            <Route path={PATHS.GETTING_STARTED} element={<SpaceGettingStarted />} />
            <Route path="settings" element={<SpacesSettings />} />
            <Route path="invite" element={<SpacesInvite />} />
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
