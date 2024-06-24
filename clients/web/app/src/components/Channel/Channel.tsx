import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import {
    Membership,
    SendMessageOptions,
    useChannelData,
    useChannelTimeline,
    useConnectivity,
    useDMData,
    useMyMembership,
    useMyProfile,
    useSpaceId,
    useSpaceMembers,
    useTownsClient,
} from 'use-towns-client'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'
import { ChannelIntro, DMChannelIntro } from '@components/ChannelIntro'
import { FullScreenMedia } from '@components/FullScreenMedia/FullScreenMedia'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
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
import { BlockedUserBottomBanner } from './components/BlockedUserBottomBanner'
import { UnjoinedChannelComponent } from './components/UnjoinedChannel'
import { useChannelSend } from './hooks/useChannelSend'
import { useMessageFieldPlaceholders } from './hooks/useMessageFieldPlaceholders'

type Props = {
    onTouchClose?: () => void
    channelId?: string
    preventAutoFocus?: boolean
    hideHeader?: boolean
}
export const Channel = (props: Props) => {
    const { channel, spaceId, channelId = 'placeholder' } = useChannelData()

    const isDm = isDMChannelStreamId(channelId)
    const isDmOrGDM = !!channelId && (isDm || isGDMChannelStreamId(channelId))
    const { loggedInWalletAddress } = useConnectivity()

    const { counterParty, data: dmData } = useDMData(channelId)

    const isChannelWritable = !!useIsChannelWritable(
        isDmOrGDM ? undefined : spaceId,
        channelId,
        loggedInWalletAddress,
    )?.isChannelWritable

    const isUserBlocked = useBlockedUsers()
    const isBlocked = useMemo(
        () => isDm && !!counterParty && isUserBlocked(counterParty),
        [isDm, counterParty, isUserBlocked],
    )

    // -------------------------------------------------------------------------

    const userIds = useMemo(
        () => (dmData?.isGroup ? dmData.userIds : [counterParty].filter(notUndefined)),
        [counterParty, dmData?.isGroup, dmData?.userIds],
    )

    const userList = useUserList({ excludeSelf: true, userIds }).join('')

    const placeholders = useMessageFieldPlaceholders({
        channelId,
        channelLabel: channel?.label,
        isChannelWritable,
        isDmOrGDM,
        userList,
    })

    // -------------------------------------------------------------------------

    const location = useLocation()
    const storageId = location.state?.fromDraft ? getDraftDMStorageId(dmData?.userIds) : channelId
    const { messageId: threadId } = useParams()

    // -------------------------------------------------------------------------

    const { onSend } = useChannelSend({ channelId, spaceId, threadId })

    // -------------------------------------------------------------------------

    const myMembership = useMyMembership(channelId)
    const showJoinChannel =
        ((myMembership && myMembership !== Membership.Join) || !myMembership) && !isDmOrGDM
    const showDMAcceptInvitation = myMembership === Membership.Invite && isDmOrGDM

    if (!channel) {
        return <></>
    }

    return (
        <ChannelLayout
            {...props}
            channel={channel}
            counterParty={counterParty}
            isBlocked={isBlocked}
            isChannelWritable={isChannelWritable}
            placeholders={placeholders}
            storageId={storageId}
            threadId={threadId}
            showJoinChannel={showJoinChannel}
            showDMAcceptInvitation={showDMAcceptInvitation}
            onTouchClose={props.onTouchClose}
            onSend={onSend}
        />
    )
}

export const DraftChannel = (props: { userIds: string[] } & Props) => {
    const { userIds, ...restProps } = props
    const userList = useUserList({ excludeSelf: true, userIds }).join('')
    const placeholders = useMessageFieldPlaceholders({
        channelId: '',
        isChannelWritable: true,
        isDmOrGDM: true,
        userList,
    })

    const storageId = getDraftDMStorageId(userIds)

    return (
        <ChannelLayout
            hideHeader
            userIds={userIds}
            channel={{
                id: '',
                label: 'placeholder',
                topic: 'placeholder',
            }}
            placeholders={placeholders}
            storageId={storageId}
            {...restProps}
        />
    )
}

type ExtendedProps = Omit<Props, 'channelId'> & {
    channel: { id: string; label: string; topic?: string }
    counterParty?: string
    isBlocked?: boolean
    isChannelWritable?: boolean
    placeholders: { placeholder: string; imageUploadTitle: string }
    storageId: string
    threadId?: string
    showJoinChannel?: boolean
    showDMAcceptInvitation?: boolean
    userIds?: string[]
    onSend?: (message: string, options?: SendMessageOptions) => void
}

export const ChannelLayout = (props: ExtendedProps) => {
    const {
        channel,
        counterParty,
        isBlocked = false,
        isChannelWritable = true,
        placeholders,
        showDMAcceptInvitation,
        showJoinChannel = false,
        storageId,
        threadId,
        userIds,
    } = props

    const { isTouch } = useDevice()
    const spaceId = useSpaceId()

    const channelId = channel.id

    const hasThreadOpen = !!threadId
    const userId = useMyProfile()?.userId
    const channels = useSpaceChannels()

    // -------------------------------------------------------------------------

    const { placeholder, imageUploadTitle } = placeholders
    const { memberIds: spaceMemberIds } = useSpaceMembers()

    // -------------------------------------------------------------------------

    return (
        <>
            {!isTouch && <RegisterChannelShortcuts />}
            {showJoinChannel && channelId ? (
                <UnjoinedChannelComponent
                    channel={channel}
                    spaceId={spaceId}
                    hideHeader={props.hideHeader}
                />
            ) : (
                <MediaDropContextProvider
                    key={channelId}
                    title={imageUploadTitle}
                    channelId={channelId ?? ''}
                    spaceId={spaceId}
                    disableDrop={!isChannelWritable}
                >
                    {channelId ? (
                        <>
                            <Messages
                                hideHeader={props.hideHeader}
                                channelId={channelId}
                                spaceId={spaceId}
                                threadId={threadId}
                            />
                            {showDMAcceptInvitation && <DMAcceptInvitation channelId={channelId} />}
                        </>
                    ) : userIds ? (
                        <Box paddingY grow justifyContent="end" gap="lg">
                            <DMChannelIntro userIds={userIds} />
                        </Box>
                    ) : (
                        <></>
                    )}

                    <Box paddingBottom={isTouch ? 'none' : 'md'} paddingX={isTouch ? 'none' : 'md'}>
                        {isBlocked && counterParty ? (
                            <BlockedUserBottomBanner userId={counterParty} />
                        ) : (
                            !showDMAcceptInvitation &&
                            userId && (
                                <>
                                    <RichTextEditor
                                        isFullWidthOnTouch
                                        editable={!!isChannelWritable}
                                        background={isChannelWritable ? 'level2' : 'level1'}
                                        displayButtons={isTouch ? 'on-focus' : 'always'}
                                        key={`${storageId}-${isChannelWritable ? '' : '-readonly'}`}
                                        storageId={storageId}
                                        autoFocus={
                                            !hasThreadOpen && !isTouch && !props.preventAutoFocus
                                        }
                                        initialValue=""
                                        placeholder={placeholder}
                                        channels={channels}
                                        userId={userId}
                                        spaceMemberIds={spaceMemberIds}
                                        onSend={props.onSend}
                                    />
                                </>
                            )
                        )}
                    </Box>
                </MediaDropContextProvider>
            )}
        </>
    )
}

const Messages = (props: {
    channelId: string
    spaceId: string | undefined
    threadId: string | undefined
    hideHeader: boolean | undefined
}) => {
    const { channelId, spaceId, threadId } = props
    const { channel } = useChannelData()
    const { client, setHighPriorityStreams } = useTownsClient()

    // -------------------------------------------------------------------------

    const { timeline: events } = useChannelTimeline()
    const location = useLocation()
    const highlightId = useMemo(() => {
        const eventHash = location.hash?.replace(/^#/, '')
        return eventHash?.match(/^[a-z0-9_-]{16,128}/i)
            ? events.some((m) => m.eventId === eventHash)
                ? eventHash
                : undefined
            : undefined
    }, [events, location.hash])

    const isDmOrGDM = isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)

    // -------------------------------------------------------------------------

    const { loggedInWalletAddress } = useConnectivity()
    const isChannelWritable = !!useIsChannelWritable(
        isDmOrGDM ? undefined : spaceId,
        channelId,
        loggedInWalletAddress,
    )?.isChannelWritable

    // -------------------------------------------------------------------------

    const [searchParams] = useSearchParams()
    const galleryId = searchParams.get(QUERY_PARAMS.GALLERY_ID)
    const galleryThreadId = searchParams.get(QUERY_PARAMS.GALLERY_THREAD_ID)

    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------

    return channel ? (
        <>
            <MessageTimelineWrapper
                key={channelId}
                spaceId={spaceId}
                channelId={channelId}
                events={events}
                isChannelWritable={isChannelWritable}
            >
                {!props.hideHeader && <ChannelHeader channel={channel} spaceId={spaceId} />}
                <MessageTimeline
                    align="bottom"
                    header={<ChannelIntro name={channel.label} roomIdentifier={channel.id} />}
                    highlightId={threadId || highlightId}
                />
            </MessageTimelineWrapper>
            {galleryId && (
                <FullScreenMedia events={events} threadId={galleryThreadId ?? undefined} />
            )}
        </>
    ) : (
        <></>
    )
}

const DMAcceptInvitation = (props: { channelId: string }) => {
    const { channelId } = props
    const { joinRoom, leaveRoom } = useTownsClient()

    const onJoinChannel = useCallback(() => {
        joinRoom(channelId)
    }, [joinRoom, channelId])

    const onLeaveChannel = useCallback(() => {
        leaveRoom(channelId)
    }, [leaveRoom, channelId])

    return (
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
    )
}
