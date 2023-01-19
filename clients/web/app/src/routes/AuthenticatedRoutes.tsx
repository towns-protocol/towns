import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { PATHS } from 'routes'
import { ChannelSettings } from './ChannelSettings'
import { InvitesIndex } from './InvitesIndex'
import { MeIndex } from './MeIndex'
import { SpaceCreate } from './SpaceCreate'
import { SpaceGettingStarted } from './SpaceGettingStarted'
import { SpaceHome } from './SpaceHome'
import { SpaceMentions } from './SpaceMentions'
import { SpacesChannel, SpacesChannelRoute } from './SpacesChannel'
import { SpacesChannelReplies } from './SpacesChannelReplies'
import { SpacesInvite } from './SpacesInvite'
import { SpacesNew } from './SpacesNew'
import { SpacesSettings } from './SpacesSettings'
import { SpaceThreads } from './SpaceThreads'

const CheckRedirect = ({ children }: { children: JSX.Element }) => {
    const { state } = useLocation()
    if (state?.redirectTo) {
        return <Navigate replace to={state.redirectTo} />
    }

    return children
}

export const AuthenticatedRoutes = () => (
    <Routes>
        <Route path="me" element={<MeIndex />} />
        <Route path="invites/:inviteSlug" element={<InvitesIndex />} />
        <Route path="spaces/new" element={<SpacesNew />} />
        <Route path="spaces/create" element={<SpaceCreate />} />
        <Route path="spaces/:spaceSlug">
            <Route index element={<SpaceHome />} />
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
        <Route
            path="*"
            element={
                <CheckRedirect>
                    <SpaceHome />
                </CheckRedirect>
            }
        />
    </Routes>
)

export default AuthenticatedRoutes
