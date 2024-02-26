import React, { Fragment } from 'react'
import { Route, Routes } from 'react-router'
import { PATHS } from 'routes'
import { SpaceContextRoute } from 'routes/SpaceContextRoute'
import { useDevice } from 'hooks/useDevice'
import { DirectMessageThread } from '@components/DirectMessages/DirectMessageThread'
import { CreateSpaceFormV2 } from '@components/Web3/MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2'
import { NestedPanel } from '@components/Panel/NestedPanel'
import { CreateMessagePanel } from '@components/DirectMessages/CreateDirectMessage/CreateDirectMessage'
import { ChannelSettings } from './ChannelSettings'
import { InvitesIndex } from './InvitesIndex'
import { SpaceGettingStarted } from './SpaceGettingStarted'
import { SpaceHome, TouchHome } from './home'
import { SpaceMentions } from './SpaceMentions'
import { SpacesChannel, SpacesChannelRoute } from './SpacesChannel'
import { SpacesChannelReplies } from './SpacesChannelReplies'
import { SpacesInvite } from './SpacesInvite'
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
import { DirectMessages } from './DMRoute'
import { DMInfoPanelWrapper } from './DMInfoPanel'
import { SpacesSettingsOld } from './SpaceSettingsOld'

const desktopSpaceProfilePanelRoutes = (prefix: string = 'profile') => [
    // eslint-disable-next-line react/jsx-key
    <Route path={`${prefix}/:profileId`} element={<SpaceProfilePanel />} />,
    // eslint-disable-next-line react/jsx-key
    <Route path={`${prefix}/:profileId/:nestedPanel`} element={<NestedPanel />} />,
]

export const AuthenticatedRoutes = () => {
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
                                    {messageRoutes}
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
                            <Route path="*" element={<OutsideTownRoutes />} />
                        </Route>
                    </>
                ) : (
                    <>
                        <Route path={`${PATHS.SPACES}/new`} element={<CreateSpaceFormV2 />} />
                        <Route element={<ValidateMembership />}>
                            <Route element={<AppPanelLayout />}>
                                <Route path={`${PATHS.SPACES}/:spaceSlug`}>
                                    <Route index element={<SpaceHome />} />
                                    <Route path="members" element={<SpaceMembers />}>
                                        {...desktopSpaceProfilePanelRoutes()}
                                        <Route path="info" element={<InfoPanelWrapper />} />
                                    </Route>
                                    {messageRoutes}
                                    <Route path="channels/:channelSlug" element={<SpacesChannel />}>
                                        <Route
                                            path="replies/:messageId"
                                            element={<SpacesChannelReplies parentRoute="../" />}
                                        />
                                        {...desktopSpaceProfilePanelRoutes()}
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
const messageRoutes = (
    <Route path="messages" element={<DirectMessages />}>
        <Route path="new" element={<CreateMessagePanel />}>
            <Route path=":channelSlug" element={<DirectMessageThread />} />
            {...desktopSpaceProfilePanelRoutes()}
        </Route>
        <Route path=":channelSlug" element={<DirectMessageThread />}>
            <Route path="replies/:messageId" element={<SpacesChannelReplies parentRoute="../" />} />
            {...desktopSpaceProfilePanelRoutes()}
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
            {messageRoutes}

            {/* catch all */}
            <Route path="*" element={<NoJoinedSpacesFallback />}>
                {...desktopSpaceProfilePanelRoutes('me')}
            </Route>
        </Routes>
    )
}

/**
 *  anything under `/t/:townId/*
 */
const TownRoutes = () => (
    <Routes>
        <Route path={PATHS.THREADS} element={<SpaceThreads />}>
            {...desktopSpaceProfilePanelRoutes()}
            <Route path="info" element={<InfoPanelWrapper />} />
        </Route>

        <Route path="mentions" element={<SpaceMentions />}>
            {...desktopSpaceProfilePanelRoutes()}
            <Route path="info" element={<InfoPanelWrapper />} />
        </Route>

        <Route path={PATHS.GETTING_STARTED} element={<SpaceGettingStarted />}>
            {...desktopSpaceProfilePanelRoutes()}
            <Route path="info" element={<InfoPanelWrapper />} />
        </Route>

        {/* TODO: Remove SpacesSettingsOld */}
        <Route path="settings-legacy" element={<SpacesSettingsOld />} />

        <Route path="invite" element={<SpacesInvite />} />

        <Route path="search" element={<TouchSearchTab />} />

        <Route element={<SpacesChannelRoute />}>
            <Route path="channels/:channelSlug/members" element={<ChannelMembers />}>
                {...desktopSpaceProfilePanelRoutes()}
                <Route path="info" element={<InfoPanelWrapper />} />
            </Route>
        </Route>

        <Route element={<SpacesChannelRoute />}>
            <Route path="channels/:channelSlug/settings" element={<ChannelSettings />} />
        </Route>
    </Routes>
)

export default AuthenticatedRoutes
