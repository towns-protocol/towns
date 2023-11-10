import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Channel, RoomIdentifier, RoomMember, useMyProfile } from 'use-zion-client'
import { ThreadStatsMap } from 'use-zion-client/dist/store/use-timeline-store'
import { useCreateLink } from 'hooks/useCreateLink'
import { Avatar, Box, BoxProps, Icon, Paragraph } from '@ui'
import { ZRoomMessageEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useDevice } from 'hooks/useDevice'
import { TouchChannelResultRow, TouchUserResultRow } from 'routes/home/TouchHome'
import { IsolatedMessageItem } from '@components/ResultItem/IsolatedMessageItem'
import { CombinedResult } from './types'
import { SearchMessagesResultItem } from './SearchMessageResultItem'

export const ResultItem = (props: {
    result: CombinedResult
    misc: {
        channels: Channel[]
        members: RoomMember[]
        threadsStats: ThreadStatsMap
        spaceId: RoomIdentifier | undefined
    }
}) => {
    const item = props.result.item
    const { createLink } = useCreateLink()

    const { isTouch } = useDevice()

    switch (item.type) {
        case 'user': {
            const link = createLink({
                profileId: item.source.userId,
            })

            return isTouch ? (
                <TouchUserResultRow member={item.source} />
            ) : link ? (
                <Link to={link}>
                    <ItemContainer>
                        <Avatar userId={item.source.userId} size="avatar_x4" />
                        <Box centerContent>
                            <Paragraph strong>
                                {getPrettyDisplayName(item.source).displayName}
                            </Paragraph>
                        </Box>
                    </ItemContainer>
                </Link>
            ) : null
        }

        case 'channel': {
            const link = createLink({
                spaceId: props.misc.spaceId?.networkId,
                channelId: item.source.channelNetworkId,
            })

            return isTouch ? (
                <TouchChannelResultRow
                    channelNetworkId={item.source.channelNetworkId}
                    name={item.source.name}
                    unread={item.source.unread}
                    mentionCount={item.source.mentionCount}
                    muted={item.source.muted}
                />
            ) : link ? (
                <Link to={link}>
                    <ItemContainer>
                        <Box
                            centerContent
                            padding="sm"
                            aspectRatio="square"
                            background="level3"
                            borderRadius="full"
                        >
                            <Icon type="tag" size="square_xs" />
                        </Box>
                        <Box centerContent>
                            <Paragraph>{item.source.name}</Paragraph>
                        </Box>
                    </ItemContainer>
                </Link>
            ) : null
        }

        case 'dmMessage': {
            return (
                <ItemContainer paddingY="md">
                    <MessageResultItem
                        event={item.source}
                        channelId={item.channelId}
                        misc={props.misc}
                        highlightedTerms={props.result.searchResult.terms}
                    />
                </ItemContainer>
            )
        }
        case 'message': {
            return (
                <ItemContainer paddingY="md">
                    <MessageResultItem
                        event={item.source}
                        channelId={item.channelId}
                        misc={props.misc}
                        highlightedTerms={props.result.searchResult.terms}
                    />
                </ItemContainer>
            )
        }
    }
}

const ItemContainer = (props: BoxProps) => (
    <Box
        hoverable
        shrink
        horizontal
        background="level2"
        gap="md"
        paddingX="md"
        paddingY="sm"
        {...props}
    />
)

export const MessageResultItem = (props: {
    event: ZRoomMessageEvent
    highlightedTerms?: string[]
    channelId: string
    misc: { members: RoomMember[]; channels: Channel[]; threadsStats: ThreadStatsMap }
}) => {
    const { event, misc } = props
    const { isTouch } = useDevice()
    const userId = useMyProfile()?.userId

    const { threadsStats, channels } = misc

    const channel = channels.find((c) => c.id.networkId === props.channelId)

    const threadStat =
        channel && event.threadParentId
            ? threadsStats[channel.id.networkId]?.[event.threadParentId]
            : undefined

    const result = useMemo(
        () =>
            channel
                ? {
                      type: 'mention' as const,
                      unread: false,
                      event,
                      channel,
                      timestamp: event.createdAtEpocMs,
                      thread: threadStat?.parentEvent,
                  }
                : undefined,
        [channel, event, threadStat?.parentEvent],
    )

    return !result ? undefined : isTouch && result ? (
        <Box inset="sm">
            <IsolatedMessageItem result={result} />
        </Box>
    ) : (
        <SearchMessagesResultItem
            highligtTerms={props.highlightedTerms}
            result={result}
            userId={userId}
        />
    )
}
