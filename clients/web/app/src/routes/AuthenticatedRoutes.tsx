import React from 'react'
import { Route, Routes } from 'react-router'
import { PATHS } from 'routes'
import { SpaceContextRoute } from 'routes/SpaceContextRoute'
import { useDevice } from 'hooks/useDevice'
import { DirectMessageThread } from '@components/DirectMessages/DirectMessageThread'
import { CreateSpaceFormV2 } from '@components/Web3/MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2'
import { CreateMessagePanel } from '@components/DirectMessages/CreateDirectMessage/CreateDirectMessage'
import { Panel } from '@components/Panel/Panel'
import { CardLabel } from '@ui'
import { ChannelSettings } from './ChannelSettings'
import { SpaceHome, TouchHome } from './home'
import { SpaceMentions } from './SpaceMentions'
import { SpacesChannel, SpacesChannelRoute } from './SpacesChannel'
import { SpacesChannelReplies } from './SpacesChannelReplies'
import { SpacesInvite } from './SpacesInvite'
import { SpaceThreads } from './SpaceThreads'
import { SpaceProfilePanel } from './SpacesProfilePanel'
import { SpaceMembers } from './SpaceMembers'
import { NoJoinedSpacesFallback } from './NoJoinedSpacesFallback'
import { ChannelMembers } from './ChannelMembers'
import { TouchProfile } from './TouchProfile'
import { SpacesChannelAnimated } from './SpacesChannelAnimated'
import { AppPanelLayout } from './layouts/AppPanelLayout'
import { TouchSearchTab } from './TouchSearchTab'
import { ValidateMembership } from './ValidateMembership'
import { DirectMessages } from './DMRoute'

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
                        <Route path={`${PATHS.SPACES}/new`} element={<CreateSpaceFormV2 />} />
                        <Route element={<ValidateMembership />}>
                            <Route path={`${PATHS.SPACES}/:spaceSlug`}>
                                <Route path="" element={<TouchHome />}>
                                    {messageRoutes}
                                    <Route
                                        path={PATHS.THREADS}
                                        element={
                                            <Panel label="Threads" padding="none" parentRoute="../">
                                                <SpaceThreads />
                                            </Panel>
                                        }
                                    />
                                    <Route
                                        path={PATHS.MENTIONS}
                                        element={
                                            <Panel
                                                label="Mentions"
                                                padding="none"
                                                parentRoute="../"
                                            >
                                                <SpaceMentions />
                                            </Panel>
                                        }
                                    />
                                    <Route
                                        path={`${PATHS.CHANNELS}/:channelSlug`}
                                        element={<SpacesChannelAnimated parentRoute="../" />}
                                    >
                                        <Route
                                            path="replies/:messageId"
                                            element={<SpacesChannelReplies parentRoute="../" />}
                                        />
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
                            <Route element={<TouchHome />}>
                                <Route path="me" element={<SpaceProfilePanel />} />
                                {/* catch all */}
                                <Route path="*" element={<NoJoinedSpacesFallback />} />
                            </Route>
                        </Route>
                    </>
                ) : (
                    <>
                        <Route element={<ValidateMembership />}>
                            <Route element={<AppPanelLayout />}>
                                <Route
                                    path={`${PATHS.SPACES}/new`}
                                    element={<CreateSpaceFormV2 />}
                                />
                                <Route path={`${PATHS.SPACES}/:spaceSlug`}>
                                    <Route index element={<SpaceHome />} />
                                    <Route path={PATHS.MEMBERS} element={<SpaceMembers />} />
                                    {messageRoutes}
                                    <Route
                                        path={`${PATHS.CHANNELS}/:channelSlug`}
                                        element={<SpacesChannel />}
                                    >
                                        <Route
                                            path={`${PATHS.REPLIES}/:messageId`}
                                            element={<SpacesChannelReplies parentRoute=".." />}
                                        />
                                    </Route>
                                    <Route
                                        path={PATHS.THREADS}
                                        element={
                                            <>
                                                <CardLabel label="Threads" />
                                                <SpaceThreads />
                                            </>
                                        }
                                    />
                                    <Route
                                        path={PATHS.MENTIONS}
                                        element={
                                            <>
                                                <CardLabel label="Mentions" />
                                                <SpaceMentions />
                                            </>
                                        }
                                    />
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
    <Route path={PATHS.MESSAGES} element={<DirectMessages />}>
        <Route path="new" element={<CreateMessagePanel />}>
            <Route path=":channelSlug" element={<DirectMessageThread />} />
            <Route path="draft">
                <Route path=":noStreamUserId" element={<CreateMessagePanel />} />
            </Route>
        </Route>
        <Route path=":channelSlug" element={<DirectMessageThread />} />
    </Route>
)

/**
 *  authenticated but not under `/t/:townId/*
 */
const OutsideTownRoutes = () => {
    return (
        <Routes>
            {messageRoutes}
            {/* catch all */}
            <Route path="*" element={<NoJoinedSpacesFallback />}>
                <Route path="me" element={<SpaceProfilePanel />} />
            </Route>
        </Routes>
    )
}

/**
 *  anything under `/t/:townId/*
 */
const TownRoutes = () => (
    <Routes>
        <Route path={PATHS.INVITE} element={<SpacesInvite />} />
        <Route path={PATHS.SEARCH} element={<TouchSearchTab />} />

        <Route path={`${PATHS.CHANNELS}/:channelSlug`}>
            <Route element={<SpacesChannelRoute />}>
                <Route path={PATHS.MEMBERS} element={<ChannelMembers />} />
                <Route path={PATHS.SETTINGS} element={<ChannelSettings />} />
            </Route>
        </Route>
    </Routes>
)

export default AuthenticatedRoutes
