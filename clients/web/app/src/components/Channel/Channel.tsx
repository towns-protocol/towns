import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import React, { useCallback, useContext, useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import {
    Membership,
    useChannelData,
    useChannelTimeline,
    useConnectivity,
    useDMData,
    useMyMembership,
    useMyProfile,
    useSpaceMembers,
    useTownsClient,
} from 'use-towns-client'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'
import { ChannelIntro } from '@components/ChannelIntro'
import { FullScreenMedia } from '@components/FullScreenMedia/FullScreenMedia'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { TouchPanelContext } from '@components/Panel/Panel'
import { RichTextEditor } from '@components/RichTextPlate/PlateEditor'
import { RegisterChannelShortcuts } from '@components/Shortcuts/RegisterChannelShortcuts'
import { useUserList } from '@components/UserList/UserList'
import { Box, Button, Stack, Text } from '@ui'
import { useBlockedUsers } from 'hooks/useBlockedUsers'
import { useDevice } from 'hooks/useDevice'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { QUERY_PARAMS } from 'routes'
import { notUndefined } from 'ui/utils/utils'
import { getDraftDMStorageId } from 'utils'
import { useMessageFieldPlaceholders } from './hooks/useMessageFieldPlaceholders'
import { UnjoinedChannelComponent } from './components/UnjoinedChannel'
import { BoxDebugger } from './components/BoxDebugger'
import { BlockedUserBottomBanner } from './components/BlockedUserBottomBanner'
import { useChannelSend } from './hooks/useChannelSend'

type Props = {
    onTouchClose?: () => void
    channelId?: string
    preventAutoFocus?: boolean
    hideHeader?: boolean
}

export const SpacesChannelComponent = (props: Props) => {
    const { messageId: threadId } = useParams()
    const { isTouch } = useDevice()

    const { client, joinRoom, leaveRoom, setHighPriorityStreams } = useTownsClient()

    const { spaceId, channelId, channel } = useChannelData()

    const location = useLocation()
    const [searchParams] = useSearchParams()
    const galleryId = searchParams.get(QUERY_PARAMS.GALLERY_ID)
    const galleryThreadId = searchParams.get(QUERY_PARAMS.GALLERY_THREAD_ID)
    const myMembership = useMyMembership(channelId)

    const { timeline: channelMessages } = useChannelTimeline()

    const { channelSettings, addChannelNotificationSettings } = useNotificationSettings()

    useEffect(() => {
        if (channelId && !channelSettings?.some((c) => c.channelId === channelId)) {
            addChannelNotificationSettings({
                channelId,
                spaceId,
            })
        }
    }, [addChannelNotificationSettings, channelId, channelSettings, spaceId])

    useEffect(() => {
        if (!client) {
            return
        }
        const streamIds = spaceId ? [channelId, spaceId] : [channelId]
        console.log('Set High Priority Streams', streamIds)
        if (channelId) {
            setHighPriorityStreams(streamIds)
        }
    }, [client, spaceId, channelId, setHighPriorityStreams])

    const onJoinChannel = useCallback(() => {
        joinRoom(channelId)
    }, [joinRoom, channelId])

    const onLeaveChannel = useCallback(() => {
        leaveRoom(channelId)
    }, [leaveRoom, channelId])

    const hasThreadOpen = !!threadId

    const highlightId = useMemo(() => {
        const eventHash = location.hash?.replace(/^#/, '')
        return eventHash?.match(/^[a-z0-9_-]{16,128}/i)
            ? channelMessages.some((m) => m.eventId === eventHash)
                ? eventHash
                : undefined
            : undefined
    }, [channelMessages, location.hash])

    const { loggedInWalletAddress } = useConnectivity()
    const userId = useMyProfile()?.userId

    const channels = useSpaceChannels()

    const isDmOrGDM = isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)

    const isChannelWritable = !!useIsChannelWritable(
        isDmOrGDM ? undefined : spaceId,
        channelId,
        loggedInWalletAddress,
    )?.isChannelWritable

    const { counterParty, data } = useDMData(channelId)
    const userIds = useMemo(
        () => (data?.isGroup ? data.userIds : [counterParty].filter(notUndefined)),
        [counterParty, data?.isGroup, data?.userIds],
    )

    const userList = useUserList({ excludeSelf: true, userIds }).join('')

    const isDm = isDMChannelStreamId(channelId)
    const isUserBlocked = useBlockedUsers()
    const isBlocked = useMemo(
        () => isDm && counterParty && isUserBlocked(counterParty),
        [isDm, counterParty, isUserBlocked],
    )
    const { placeholder, imageUploadTitle } = useMessageFieldPlaceholders({
        channelId,
        channelLabel: channel?.label,
        isChannelWritable,
        isDmOrGDM,
        userList,
    })

    const showJoinChannel =
        ((myMembership && myMembership !== Membership.Join) || !myMembership) && !isDmOrGDM

    const showDMAcceptInvitation = myMembership === Membership.Invite && isDmOrGDM

    const triggerClose = useContext(TouchPanelContext)?.triggerPanelClose

    const { onSend } = useChannelSend({ channelId, spaceId, threadId })
    const { memberIds } = useSpaceMembers()

    return (
        <>
            {!isTouch && <RegisterChannelShortcuts />}
            {channel && showJoinChannel ? (
                <UnjoinedChannelComponent
                    channel={channel}
                    spaceId={spaceId}
                    triggerClose={triggerClose}
                    hideHeader={props.hideHeader}
                    onJoinChannel={onJoinChannel}
                />
            ) : (
                <MediaDropContextProvider
                    key={channelId}
                    title={imageUploadTitle}
                    channelId={channelId}
                    spaceId={spaceId}
                    disableDrop={!isChannelWritable}
                >
                    <MessageTimelineWrapper
                        key={channelId}
                        spaceId={spaceId}
                        channelId={channelId}
                        events={channelMessages}
                        isChannelWritable={isChannelWritable}
                    >
                        {channel && !props.hideHeader && (
                            <ChannelHeader
                                channel={channel}
                                spaceId={spaceId}
                                onTouchClose={triggerClose}
                            />
                        )}

                        <MessageTimeline
                            align="bottom"
                            header={
                                channel && (
                                    <ChannelIntro
                                        name={channel.label}
                                        roomIdentifier={channel.id}
                                    />
                                )
                            }
                            highlightId={threadId || highlightId}
                        />
                    </MessageTimelineWrapper>
                    <BoxDebugger />
                    <Box paddingBottom={isTouch ? 'none' : 'md'} paddingX={isTouch ? 'none' : 'md'}>
                        {isBlocked && counterParty ? (
                            <BlockedUserBottomBanner userId={counterParty} />
                        ) : (
                            <>
                                {!showDMAcceptInvitation && channel && userId && (
                                    <RichTextEditor
                                        isFullWidthOnTouch
                                        editable={!!isChannelWritable}
                                        background={isChannelWritable ? 'level2' : 'level1'}
                                        displayButtons={isTouch ? 'on-focus' : 'always'}
                                        key={`${channelId}-${isChannelWritable ? '' : '-readonly'}`}
                                        storageId={
                                            location.state?.fromDraft
                                                ? getDraftDMStorageId(data?.userIds)
                                                : channel.id
                                        }
                                        autoFocus={
                                            !hasThreadOpen && !isTouch && !props.preventAutoFocus
                                        }
                                        initialValue=""
                                        placeholder={placeholder}
                                        channels={channels}
                                        userId={userId}
                                        memberIds={memberIds}
                                        onSend={onSend}
                                    />
                                )}
                            </>
                        )}
                    </Box>
                </MediaDropContextProvider>
            )}

            {galleryId && (
                <FullScreenMedia events={channelMessages} threadId={galleryThreadId ?? undefined} />
            )}
            {showDMAcceptInvitation && (
                <Stack borderTop padding gap centerContent width="100%">
                    <Text fontWeight="medium">You&apos;ve been invited to a Direct Message</Text>
                    <Stack horizontal gap>
                        <Button tone="cta1" onClick={onJoinChannel}>
                            Join
                        </Button>
                        <Button tone="level2" onClick={onLeaveChannel}>
                            Ignore
                        </Button>
                    </Stack>
                </Stack>
            )}
        </>
    )
}
