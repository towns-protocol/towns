import React from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { SpaceSettings } from '@components/SpaceSettings/SpaceSettings'
import { PATHS } from 'routes'
import { RoleSettings } from '@components/SpaceSettings/RoleSettings/RoleSettings'
import { RoleSettingsPermissions } from '@components/SpaceSettings/RoleSettings/RoleSettingsPermissions'
import { RoleSettingsGating } from '@components/SpaceSettings/RoleSettings/RoleSettingsGating'
import { RoleSettingsDisplay } from '@components/SpaceSettings/RoleSettings/RoleSettingsDisplay'
import { useIsHolderOfPioneerNFT } from 'api/lib/isHolderOfToken'
import { env } from 'utils'
import { SpaceContextRoute } from 'routes/SpaceContextRoute'
import { useDevice } from 'hooks/useDevice'
import { DirectMessageIndex } from '@components/DirectMessages/DirectMessageIndex'
import { DirectMessageThread } from '@components/DirectMessages/DirectMessageThread'
import { CreateSpaceFormV2 } from '@components/Web3/MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2'
import { ChannelSettings } from './ChannelSettings'
import { InvitesIndex } from './InvitesIndex'
import { SpaceGettingStarted } from './SpaceGettingStarted'
import { SpaceHome, TouchHome } from './home'
import { SpaceMentions } from './SpaceMentions'
import { SpacesChannel, SpacesChannelRoute } from './SpacesChannel'
import { SpacesChannelReplies } from './SpacesChannelReplies'
import { SpacesInvite } from './SpacesInvite'
import { SpacesSettingsOld } from './SpaceSettingsOld'
import { SpaceThreads } from './SpaceThreads'
import { SpaceProfilePanel } from './SpacesProfilePanel'
import { SpaceMembers } from './SpaceMembers'
import { InfoPanelWrapper } from './InfoPanel'
import { NoJoinedSpacesFallback } from './NoJoinedSpacesFallback'
import { ChannelMembers } from './ChannelMembers'
import { TouchProfile } from './TouchProfile'
import { SpacesChannelAnimated } from './SpacesChannelAnimated'
import { AppPanelLayout } from './layouts/AppPanelLayout'
import { TouchSearchTab } from './TouchSearchTab'
import { ValidateMembership } from './ValidateMembership'
import { DMInfoPanelWrapper } from './DMInfoPanel'

const CheckRedirect = () => {
    const { state } = useLocation()
    if (state?.redirectTo) {
        return <Navigate replace to={state.redirectTo} />
    }

    return <Outlet />
}

export const AuthenticatedRoutes = () => {
    const { data: isHolderOfPioneerNft } = useIsHolderOfPioneerNFT()
    const { isTouch } = useDevice()

    return (
        <Routes>
            {/* 
                space context is "available" but its value `space` remains undefined outside /t/:townId/* 
            */}
            <Route element={<SpaceContextRoute />}>
                {isTouch ? (
                    <>
                        <Route element={<ValidateMembership />}>
                            <Route path={`${PATHS.SPACES}/:spaceSlug`}>
                                <Route path="" element={<TouchHome />}>
                                    <Route path="info" element={<InfoPanelWrapper />} />
                                    {messages}
                                    <Route
                                        path="channels/:channelSlug"
                                        element={<SpacesChannelAnimated />}
                                    >
                                        <Route
                                            path="replies/:messageId"
                                            element={<SpacesChannelReplies parentRoute="../" />}
                                        />
                                        <Route
                                            path="profile/:profileId"
                                            element={<SpaceProfilePanel />}
                                        />
                                        <Route path="info" element={<InfoPanelWrapper />} />
                                    </Route>
                                    <Route
                                        path={`${PATHS.PROFILE}/me`}
                                        element={<TouchProfile />}
                                    />
                                    <Route
                                        path={`${PATHS.PROFILE}/:profileId`}
                                        element={<SpaceProfilePanel />}
                                    />
                                    <Route path="*" element={<TownRoutes />} />
                                </Route>
                            </Route>
                        </Route>
                        <Route path="*" element={<OutsideTownRoutes />} />
                    </>
                ) : (
                    <>
                        {(env.DEV || isHolderOfPioneerNft) && (
                            <>
                                <Route
                                    path={`${PATHS.SPACES}/new`}
                                    element={<CreateSpaceFormV2 />}
                                />
                            </>
                        )}
                        <Route element={<ValidateMembership />}>
                            <Route element={<AppPanelLayout />}>
                                <Route path={`${PATHS.SPACES}/:spaceSlug`}>
                                    <Route index element={<SpaceHome />} />
                                    <Route path="members" element={<SpaceMembers />}>
                                        <Route
                                            path="profile/:profileId"
                                            element={<SpaceProfilePanel />}
                                        />
                                        <Route path="info" element={<InfoPanelWrapper />} />
                                    </Route>
                                    <Route path="channels/:channelSlug" element={<SpacesChannel />}>
                                        <Route
                                            path="replies/:messageId"
                                            element={<SpacesChannelReplies parentRoute="../" />}
                                        />
                                        <Route
                                            path="profile/:profileId"
                                            element={<SpaceProfilePanel />}
                                        />
                                        <Route path="info" element={<InfoPanelWrapper />} />
                                    </Route>
                                    <Route path="*" element={<TownRoutes />} />
                                </Route>
                                <Route path="*" element={<OutsideTownRoutes />} />
                            </Route>
                        </Route>
                    </>
                )}
            </Route>
        </Routes>
    )
}
const messages = (
    <Route path="messages" element={<DirectMessageIndex />}>
        <Route path=":channelSlug" element={<DirectMessageThread />}>
            <Route path="replies/:messageId" element={<SpacesChannelReplies parentRoute="../" />} />
            <Route path="profile/:profileId" element={<SpaceProfilePanel />} />
            <Route path="info" element={<DMInfoPanelWrapper />} />
        </Route>
    </Route>
)

/**
 *  authenticated but not under `/t/:townId/*
 */
const OutsideTownRoutes = () => {
    return (
        <Routes>
            <Route path="invites/:inviteSlug" element={<InvitesIndex />} />
            {messages}

            {/* catch all */}
            <Route element={<CheckRedirect />}>
                <Route path="*" element={<NoJoinedSpacesFallback />}>
                    <Route path="me" element={<SpaceProfilePanel />} />
                </Route>
            </Route>
        </Routes>
    )
}

/**
 *  anything under `/t/:townId/*
 */
const TownRoutes = () => (
    <Routes>
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

        {/* TODO: Remove SpacesSettingsOld */}
        <Route path="settings-legacy" element={<SpacesSettingsOld />} />

        <Route path="settings" element={<SpaceSettings />}>
            <Route path="roles/:role" element={<RoleSettings />}>
                <Route index path="permissions" element={<RoleSettingsPermissions />} />
                <Route path="gating" element={<RoleSettingsGating />} />
                <Route path="display" element={<RoleSettingsDisplay />} />
            </Route>
        </Route>

        <Route path="invite" element={<SpacesInvite />} />

        <Route path="search" element={<TouchSearchTab />} />

        <Route element={<SpacesChannelRoute />}>
            <Route path="channels/:channelSlug/members" element={<ChannelMembers />}>
                <Route path="profile/:profileId" element={<SpaceProfilePanel />} />
                <Route path="info" element={<InfoPanelWrapper />} />
            </Route>
        </Route>

        <Route element={<SpacesChannelRoute />}>
            <Route path="channels/:channelSlug/settings" element={<ChannelSettings />} />
        </Route>
    </Routes>
)

export default AuthenticatedRoutes
