import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { SpaceSettings } from '@components/SpaceSettings/SpaceSettings'
import { PATHS } from 'routes'
import { RoleSettings } from '@components/SpaceSettings/RoleSettings/RoleSettings'
import { RoleSettingsPermissions } from '@components/SpaceSettings/RoleSettings/RoleSettingsPermissions'
import { RoleSettingsMembers } from '@components/SpaceSettings/RoleSettings/RoleSettingsMembers'
import { RoleSettingsDisplay } from '@components/SpaceSettings/RoleSettings/RoleSettingsDisplay'
import { useIsHolderOfPioneerNFT } from 'api/lib/isHolderOfToken'
import { env } from 'utils'
import { DocumentTitleFromSpaceOutlet } from 'routes/DocumentTitleFromSpaceOutlet'
import { ChannelSettings } from './ChannelSettings'
import { InvitesIndex } from './InvitesIndex'
import { MeIndex } from './MeIndex'
import { SpaceGettingStarted } from './SpaceGettingStarted'
import { SpaceHome } from './SpaceHome'
import { SpaceMentions } from './SpaceMentions'
import { SpacesChannel, SpacesChannelRoute } from './SpacesChannel'
import { SpacesChannelReplies } from './SpacesChannelReplies'
import { SpacesInvite } from './SpacesInvite'
import { SpacesNew } from './SpacesNew'
import { SpacesSettingsOld } from './SpaceSettingsOld'
import { SpaceThreads } from './SpaceThreads'
import { SpaceProfilePanel } from './SpacesProfilePanel'
import { SpaceMembers } from './SpaceMembers'
import { InfoPanelWrapper } from './InfoPanel'
import { NoJoinedSpacesFallback } from './NoJoinedSpacesFallback'

const CheckRedirect = ({ children }: { children: JSX.Element }) => {
    const { state } = useLocation()
    if (state?.redirectTo) {
        return <Navigate replace to={state.redirectTo} />
    }

    return children
}

export const AuthenticatedRoutes = () => {
    const { data: isHolderOfPioneerNft } = useIsHolderOfPioneerNFT()

    return (
        <Routes>
            <Route path="me" element={<MeIndex />} />
            <Route path="invites/:inviteSlug" element={<InvitesIndex />} />
            {(env.IS_DEV || isHolderOfPioneerNft) && (
                <Route path="spaces/new" element={<SpacesNew />} />
            )}
            <Route path="spaces/:spaceSlug" element={<DocumentTitleFromSpaceOutlet />}>
                <Route index element={<SpaceHome />} />
                <Route path="threads" element={<SpaceThreads />}>
                    <Route path="profile/:profileId" element={<SpaceProfilePanel />} />
                    <Route path="info" element={<InfoPanelWrapper />} />
                </Route>

                <Route path="mentions" element={<SpaceMentions />}>
                    <Route path="profile/:profileId" element={<SpaceProfilePanel />} />
                    <Route path="info" element={<InfoPanelWrapper />} />
                </Route>

                <Route path={PATHS.GETTING_STARTED} element={<SpaceGettingStarted />}>
                    <Route path="info" element={<InfoPanelWrapper />} />
                </Route>

                <Route path="settings-legacy" element={<SpacesSettingsOld />} />

                <Route path="settings" element={<SpaceSettings />}>
                    <Route path="roles/:role" element={<RoleSettings />}>
                        <Route index path="permissions" element={<RoleSettingsPermissions />} />
                        <Route path="members" element={<RoleSettingsMembers />} />
                        <Route path="display" element={<RoleSettingsDisplay />} />
                    </Route>
                </Route>

                <Route path="invite" element={<SpacesInvite />} />

                <Route path="members" element={<SpaceMembers />}>
                    <Route path="profile/:profileId" element={<SpaceProfilePanel />} />
                    <Route path="info" element={<InfoPanelWrapper />} />
                </Route>

                <Route path="channels/:channelSlug" element={<SpacesChannel />}>
                    <Route
                        path="replies/:messageId"
                        element={<SpacesChannelReplies parentRoute=".." />}
                    />
                    <Route path="profile/:profileId" element={<SpaceProfilePanel />} />
                    <Route path="info" element={<InfoPanelWrapper />} />
                </Route>

                <Route element={<SpacesChannelRoute />}>
                    <Route path="channels/:channelSlug/settings" element={<ChannelSettings />} />
                </Route>
            </Route>
            <Route
                path="*"
                element={
                    <CheckRedirect>
                        <NoJoinedSpacesFallback />
                    </CheckRedirect>
                }
            />
        </Routes>
    )
}

export default AuthenticatedRoutes
