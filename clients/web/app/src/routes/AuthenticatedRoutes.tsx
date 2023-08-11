import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { SpaceSettings } from '@components/SpaceSettings/SpaceSettings'
import { PATHS } from 'routes'
import { RoleSettings } from '@components/SpaceSettings/RoleSettings/RoleSettings'
import { RoleSettingsPermissions } from '@components/SpaceSettings/RoleSettings/RoleSettingsPermissions'
import { RoleSettingsGating } from '@components/SpaceSettings/RoleSettings/RoleSettingsGating'
import { RoleSettingsDisplay } from '@components/SpaceSettings/RoleSettings/RoleSettingsDisplay'
import { useIsHolderOfPioneerNFT } from 'api/lib/isHolderOfToken'
import { env } from 'utils'
import { SpaceOutlet } from 'routes/SpaceOutlet'
import { useDevice } from 'hooks/useDevice'
import { DirectMessageIndex } from '@components/DirectMessages/DirectMessageIndex'
import { DirectMessageThread } from '@components/DirectMessages/DirectMessageThread'
import { ChannelSettings } from './ChannelSettings'
import { InvitesIndex } from './InvitesIndex'
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
import { ChannelMembers } from './ChannelMembers'
import { TouchHome } from './TouchHome'
import { TouchProfile } from './TouchProfile'

const CheckRedirect = ({ children }: { children: JSX.Element }) => {
    const { state } = useLocation()
    if (state?.redirectTo) {
        return <Navigate replace to={state.redirectTo} />
    }

    return children
}

export const AuthenticatedRoutes = () => {
    const { data: isHolderOfPioneerNft } = useIsHolderOfPioneerNFT()
    const { isTouch } = useDevice()

    return (
        <Routes>
            <Route path="invites/:inviteSlug" element={<InvitesIndex />} />
            {(env.IS_DEV || isHolderOfPioneerNft) && (
                <Route path={`${PATHS.SPACES}/new`} element={<SpacesNew />} />
            )}
            <Route path={`${PATHS.SPACES}/:spaceSlug`} element={<SpaceOutlet />}>
                {isTouch ? (
                    <>
                        <Route path="" element={<TouchHome />}>
                            <Route path="info" element={<InfoPanelWrapper />} />
                        </Route>
                        <Route path={`${PATHS.PROFILE}/:profileId`} element={<TouchProfile />} />
                    </>
                ) : (
                    <>
                        <Route index element={<SpaceHome />} />
                        <Route path="members" element={<SpaceMembers />}>
                            <Route path="profile/:profileId" element={<SpaceProfilePanel />} />
                            <Route path="info" element={<InfoPanelWrapper />} />
                        </Route>
                    </>
                )}
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
                        <Route path="gating" element={<RoleSettingsGating />} />
                        <Route path="display" element={<RoleSettingsDisplay />} />
                    </Route>
                </Route>

                <Route path="invite" element={<SpacesInvite />} />

                <Route element={<SpacesChannelRoute />}>
                    <Route path="channels/:channelSlug/members" element={<ChannelMembers />}>
                        <Route path="profile/:profileId" element={<SpaceProfilePanel />} />
                        <Route path="info" element={<InfoPanelWrapper />} />
                    </Route>
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

            <Route path="messages" element={<DirectMessageIndex />} />
            <Route path="messages/:messageId" element={<DirectMessageThread />} />

            <Route
                path="*"
                element={
                    <CheckRedirect>
                        <NoJoinedSpacesFallback />
                    </CheckRedirect>
                }
            >
                <Route path="me" element={<SpaceProfilePanel />} />
            </Route>
        </Routes>
    )
}

export default AuthenticatedRoutes
