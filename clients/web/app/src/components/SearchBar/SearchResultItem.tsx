import React, { useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    Channel,
    DMChannelIdentifier,
    RoomMember,
    useMyProfile,
    useTownsClient,
} from 'use-towns-client'
import { ThreadStatsMap } from 'use-towns-client/dist/store/use-timeline-store'
import { useCreateLink } from 'hooks/useCreateLink'
import { Box, BoxProps, Icon, Paragraph } from '@ui'
import { ZRoomMessageEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useDevice } from 'hooks/useDevice'
import { TouchChannelResultRow, TouchUserResultRow } from 'routes/home/TouchHome'
import { IsolatedMessageItem } from '@components/ResultItem/IsolatedMessageItem'
import { Avatar } from '@components/Avatar/Avatar'
import { DirectMessageName } from '@components/DirectMessages/DirectMessageListItem'
import { GroupDMIcon } from '@components/DirectMessages/GroupDMIcon'
import { CombinedResult } from './types'
import { SearchMessagesResultItem } from './SearchMessageResultItem'

export const ResultItem = (
    props: {
        result: CombinedResult
        misc: {
            channels: Channel[]
            dmChannelIds: DMChannelIdentifier[]
            members: RoomMember[]
            threadsStats: ThreadStatsMap
            spaceId: string | undefined
        }
    } & BoxProps,
) => {
    const { result, selected, misc: miscProps, ...boxProps } = props
    const item = result.item

    const { createLink } = useCreateLink()

    const { dmChannelIds } = miscProps

    const { createDirectMessage } = useCreateUserDM()

    const { isTouch } = useDevice()
    if (selected) {
        boxProps.background = 'level3'
    }

    switch (item.type) {
        case 'user': {
            const userId = item.source.userId

            return isTouch ? (
                <TouchUserResultRow member={item.source} />
            ) : (
                <ItemContainer
                    {...boxProps}
                    onClick={() => void createDirectMessage(userId, dmChannelIds)}
                >
                    <Avatar userId={item.source.userId} size="avatar_x4" />
                    <Box centerContent>
                        <Paragraph>{getPrettyDisplayName(item.source)}</Paragraph>
                    </Box>
                </ItemContainer>
            )
        }

        case 'channel': {
            const link = createLink({
                spaceId: miscProps.spaceId,
                channelId: item.source.id,
            })

            return isTouch ? (
                <TouchChannelResultRow
                    itemLink={{ channelId: item.source.id }}
                    name={item.source.label}
                    unread={item.source.unread}
                    mentionCount={item.source.mentionCount}
                    muted={item.source.muted}
                />
            ) : link ? (
                <Link to={link}>
                    <ItemContainer {...boxProps}>
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
                            <Paragraph>{item.source.label}</Paragraph>
                        </Box>
                    </ItemContainer>
                </Link>
            ) : null
        }

        case 'dmChannel': {
            const link = createLink({
                spaceId: miscProps.spaceId,
                messageId: item.source.id,
            })

            return isTouch ? (
                <TouchChannelResultRow
                    itemLink={{ channelId: item.source.id }}
                    name={
                        <DirectMessageName channelId={item.source.id} label={item.source.label} />
                    }
                    unread={false}
                    mentionCount={0}
                    muted={false}
                />
            ) : link ? (
                <Link to={link}>
                    <ItemContainer {...boxProps}>
                        <Box centerContent width="x4">
                            <GroupDMIcon roomIdentifier={item.source.id} width="x4" />
                        </Box>
                        <Box centerContent>
                            <Paragraph>
                                <DirectMessageName
                                    channelId={item.source.id}
                                    label={item.source.label}
                                />
                            </Paragraph>
                        </Box>
                    </ItemContainer>
                </Link>
            ) : null
        }

        case 'dmMessage': {
            return (
                <ItemContainer paddingY="md" {...boxProps}>
                    <MessageResultItem
                        event={item.source}
                        channelId={item.channelId}
                        misc={miscProps}
                        highlightedTerms={result.searchResult.terms}
                    />
                </ItemContainer>
            )
        }
        case 'message': {
            return (
                <ItemContainer paddingY="md" {...boxProps}>
                    <MessageResultItem
                        event={item.source}
                        channelId={item.channelId}
                        misc={miscProps}
                        highlightedTerms={result.searchResult.terms}
                    />
                </ItemContainer>
            )
        }
        case 'action': {
            return (
                <ItemContainer paddingY="md" {...boxProps} onClick={item.source.callback}>
                    <Box
                        centerContent
                        padding="sm"
                        aspectRatio="square"
                        background="level3"
                        borderRadius="full"
                    >
                        <Icon type={item.source.icon} size="square_xs" />
                    </Box>
                    <Box centerContent>
                        <Paragraph>{item.source.label}</Paragraph>
                    </Box>
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
        gap="sm"
        paddingX="md"
        paddingY="sm"
        {...props}
    />
)

const MessageResultItem = (props: {
    event: ZRoomMessageEvent
    highlightedTerms?: string[]
    channelId: string
    misc: { members: RoomMember[]; channels: Channel[]; threadsStats: ThreadStatsMap }
    isolatedLayout?: boolean
}) => {
    const { event, misc, isolatedLayout } = props
    const { isTouch } = useDevice()
    const userId = useMyProfile()?.userId

    const { threadsStats, channels } = misc

    const channel = channels.find((c) => c.id === props.channelId)

    const threadStat =
        channel && event.threadParentId
            ? threadsStats[channel.id]?.[event.threadParentId]
            : undefined

    const result = useMemo(
        () =>
            channel
                ? {
                      type: 'mention' as const,
                      unread: false,
                      event,
                      channel,
                      timestamp: event.createdAtEpochMs,
                      thread: threadStat?.parentEvent,
                  }
                : undefined,
        [channel, event, threadStat?.parentEvent],
    )

    return !result ? undefined : isolatedLayout && isTouch && result ? (
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

const useCreateUserDM = () => {
    const navigate = useNavigate()
    const { createLink } = useCreateLink()

    const { createDMChannel } = useTownsClient()

    const createDirectMessage = useCallback(
        async (userId: string, dmChannelIds: DMChannelIdentifier[]) => {
            let messageId = dmChannelIds.find(
                (dm) => dm.userIds.length === 1 && dm.userIds[0] === userId,
            )?.id

            if (!messageId) {
                messageId = await createDMChannel(userId)
            }

            const link = createLink({ messageId: messageId })

            if (messageId && link) {
                navigate(link)
            }
        },
        [createDMChannel, createLink, navigate],
    )

    return { createDirectMessage }
}
