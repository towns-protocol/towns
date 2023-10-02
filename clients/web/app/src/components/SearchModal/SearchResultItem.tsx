import React from 'react'
import { Link } from 'react-router-dom'
import { Channel, RoomIdentifier, RoomMember, useMyProfile } from 'use-zion-client'
import { ThreadStatsMap } from 'use-zion-client/dist/store/use-timeline-store'
import { useCreateLink } from 'hooks/useCreateLink'
import { Avatar, Box, Icon, Paragraph } from '@ui'
import { IsolatedMessageItem } from '@components/ResultItem/IsolatedMessageItem'
import { ZRoomMessageEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useDevice } from 'hooks/useDevice'
import { TouchChannelResultRow, TouchUserResultRow } from 'routes/home/TouchHome'
import { CombinedResult } from './types'

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
                    <Box
                        hoverable
                        padding
                        shrink
                        horizontal
                        background="level2"
                        rounded="sm"
                        gap="sm"
                    >
                        <Box minWidth="x8" padding="sm">
                            <Avatar userId={item.source.userId} />
                        </Box>
                        <Box centerContent>
                            <Paragraph strong>{getPrettyDisplayName(item.source).name}</Paragraph>
                        </Box>
                    </Box>
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
                    <Box hoverable padding shrink horizontal gap background="level2" rounded="sm">
                        <Box minWidth="x8" padding="sm">
                            <Box
                                centerContent
                                padding="sm"
                                aspectRatio="square"
                                background="level3"
                                borderRadius="sm"
                            >
                                <Icon type="tag" />
                            </Box>
                        </Box>
                        <Box centerContent>
                            <Paragraph>{item.source.name}</Paragraph>
                        </Box>
                    </Box>
                </Link>
            ) : null
        }

        case 'message': {
            return (
                <MessageResultItem
                    event={item.source}
                    channelId={item.channelId}
                    misc={props.misc}
                    highlightedTerms={props.result.searchResult.terms}
                />
            )
        }
    }
}

export const MessageResultItem = (props: {
    event: ZRoomMessageEvent
    highlightedTerms?: string[]
    channelId: string
    misc: { members: RoomMember[]; channels: Channel[]; threadsStats: ThreadStatsMap }
}) => {
    const userId = useMyProfile()?.userId
    const { event, misc } = props
    const { threadsStats, channels } = misc

    const channel = channels.find((c) => c.id.networkId === props.channelId)

    if (!channel) {
        return <></>
    }

    const threadStat = event.threadParentId
        ? threadsStats[channel.id.networkId]?.[event.threadParentId]
        : undefined

    return (
        <IsolatedMessageItem
            highligtTerms={props.highlightedTerms}
            result={{
                type: 'mention',
                unread: false,
                event,
                channel,
                timestamp: event.createdAtEpocMs,
                thread: threadStat?.parentEvent,
            }}
            userId={userId}
        />
    )
}
