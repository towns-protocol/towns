import React, { useCallback } from 'react'
import {
    TimelinePin,
    useChannelId,
    useConnectivity,
    usePins,
    useSpaceId,
    useTownsClient,
    useUserLookup,
} from 'use-towns-client'
import { useLocation, useNavigate } from 'react-router'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { MessageLayout } from '@components/MessageLayout'
import { Panel } from '@components/Panel/Panel'
import { RichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Box, Icon, IconButton, Paragraph, Stack } from '@ui'
import { MessageAttachments } from '@components/MessageAttachments/MessageAttachments'
import { isRoomMessage } from '@components/MessageTimeline/util/getEventsByDate'
import { useIsChannelPinnable } from 'hooks/useIsChannelPinnable'

export const PinsPanel = () => {
    const { loggedInWalletAddress } = useConnectivity()
    const spaceId = useSpaceId()
    const channelId = useChannelId()

    const isDmOrGDM = isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)

    const isChannelPinnable = !!useIsChannelPinnable(
        isDmOrGDM ? undefined : spaceId,
        channelId,
        loggedInWalletAddress,
    )?.isChannelPinnable

    const pins = usePins(channelId)

    return (
        <Panel label="Pinned" padding="none">
            <Stack grow paddingY="sm" paddingX="sm">
                {pins?.length ? (
                    pins?.map((pin) => (
                        <PinnedMessage
                            key={pin.event.hashStr}
                            pin={pin}
                            channelId={channelId}
                            canPin={isChannelPinnable}
                        />
                    ))
                ) : (
                    <Box centerContent grow gap color="gray2">
                        <Icon type="pin" />
                        <Paragraph>No pins just yet</Paragraph>
                    </Box>
                )}
            </Stack>
        </Panel>
    )
}

const PinnedMessage = (props: { pin: TimelinePin; channelId: string; canPin?: boolean }) => {
    const { canPin, channelId, pin } = props
    const { unpinMessage } = useTownsClient()
    const { event: pinnedEvent, timelineEvent } = pin
    const senderId = pinnedEvent.creatorUserId
    const sender = useUserLookup(senderId)

    const navigate = useNavigate()
    const location = useLocation()
    const onMessageClick = useCallback(() => {
        navigate({
            pathname: location.pathname,
            search: location.search,
            hash: pinnedEvent.hashStr,
        })
    }, [location.pathname, location.search, navigate, pinnedEvent.hashStr])

    const onUnpin = useCallback(() => {
        unpinMessage(channelId, pin.event.hashStr)
    }, [channelId, pin.event.hashStr, unpinMessage])

    return (
        <MessageLayout
            relativeDate
            hoverable
            paddingX="sm"
            paddingY="md"
            id={`event-${pinnedEvent.hashStr}`}
            background={{ hover: 'positiveSubtle', default: 'none' }}
            tabIndex={-1}
            avatarSize="avatar_x4"
            userId={senderId}
            senderId={senderId}
            name={getPrettyDisplayName(sender)}
            pin={pin}
            cursor="pointer"
            rounded="sm"
            user={sender}
            timestamp={Number(timelineEvent.createdAtEpochMs)}
            onClick={onMessageClick}
        >
            {isRoomMessage(timelineEvent) ? (
                <>
                    <RichTextPreview
                        mentions={timelineEvent.content.mentions}
                        content={timelineEvent.content.body}
                    />
                    {(timelineEvent.content.attachments?.length ?? 0) > 0 && (
                        <MessageAttachments attachments={timelineEvent.content.attachments} />
                    )}
                </>
            ) : (
                <></>
            )}
            {canPin && (
                <IconButton
                    background="positiveSubtle"
                    tooltip="Unpin"
                    position="topRight"
                    icon="unpin"
                    color="cta1"
                    size="square_xxs"
                    onClick={onUnpin}
                />
            )}
        </MessageLayout>
    )
}
