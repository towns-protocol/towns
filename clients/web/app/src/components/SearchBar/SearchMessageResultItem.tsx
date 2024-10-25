import React, { useContext, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
    EventStatus,
    MentionResult as MessageResult,
    useDMData,
    useSpaceId,
    useUserLookupContext,
} from 'use-towns-client'
import { formatDistance } from 'date-fns'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { RichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { Box, BoxProps, Stack, Text } from '@ui'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { PATHS } from 'routes'
import { atoms } from 'ui/styles/atoms.css'
import { getIsRoomMessageContent, getMessageBody } from 'utils/ztevent_util'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'
import { SearchContext } from '@components/SearchContext/SearchContext'
import { formatShortDate } from 'utils/formatDates'
import { UserList } from '@components/UserList/UserList'
import { addressFromSpaceId, notUndefined } from 'ui/utils/utils'
import { useDevice } from 'hooks/useDevice'

const createMessageLink = (
    isTouch: boolean,
    channelId: string,
    eventId: string,
    threadId?: string,
    spaceId?: string,
) => {
    if (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)) {
        return isTouch
            ? `/${PATHS.SPACES}/${addressFromSpaceId(spaceId)}/${
                  PATHS.MESSAGES
              }/${channelId}/#${eventId}`
            : `/${PATHS.MESSAGES}/${channelId}/#${eventId}`
    }

    if (!spaceId) {
        return undefined
    }
    const channelSegment = `/${PATHS.SPACES}/${addressFromSpaceId(spaceId)}/${
        PATHS.CHANNELS
    }/${channelId}/`
    const threadSegment = threadId ? `${PATHS.REPLIES}/${threadId}/` : ``
    const eventSegment = `#${eventId}`
    return `${channelSegment}${threadSegment}${eventSegment}`
}

export const SearchMessagesResultItem = (
    props: {
        result: Omit<MessageResult, 'type'> & { type: 'mention' | 'search' }
        userId?: string
        highligtTerms?: string[]
    } & BoxProps,
) => {
    const { result } = props
    const spaceSlug = useSpaceId() ?? ''
    const content = getIsRoomMessageContent(result.event)

    const { lookupUser } = useUserLookupContext()

    const channels = useSpaceChannels()
    const channel = useMemo(
        () => channels.find((c) => c.id === result.channelId) ?? { label: 'loading...' },
        [channels, result.channelId],
    )
    const sender = lookupUser(result.event.sender.id)
    const ref = React.useRef<HTMLAnchorElement>(null)

    const displayName = getPrettyDisplayName(sender)

    const { isTouch } = useDevice()

    const link = useMemo(() => {
        return createMessageLink(
            isTouch,
            result.channelId,
            result.event.eventId,
            result.thread?.eventId,
            spaceSlug,
        )
    }, [isTouch, result.channelId, result.event.eventId, result.thread?.eventId, spaceSlug])

    useEffect(() => {
        if (props.selected && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [props.selected])

    const isMessageSearch = useContext(SearchContext) === 'messages'

    const { counterParty, data } = useDMData(result.channelId)

    const userIds = useMemo(
        () => (data?.isGroup ? data.userIds ?? [] : [counterParty].filter(notUndefined)),
        [counterParty, data?.isGroup, data?.userIds],
    )

    if (!content) {
        return null
    }

    const channelLabel =
        isMessageSearch && userIds.length > 0 ? (
            <UserList userIds={userIds} />
        ) : channel.label.length > 0 ? (
            `${result.thread ? `Thread in` : ``} #${channel.label.toLowerCase()}`
        ) : (
            ''
        )

    const timestamp = result.event.createdAtEpochMs

    const date = timestamp
        ? `${formatDistance(timestamp, Date.now(), {
              addSuffix: true,
          })}`
        : undefined

    const item = (
        <Box horizontal grow gap="sm">
            {isMessageSearch ? (
                <Box width="x4">
                    <Avatar userId={sender?.userId} size="avatar_x4" />
                </Box>
            ) : (
                <Box width="x4" paddingY="xxs">
                    <Avatar userId={sender?.userId} size="avatar_x4" />
                </Box>
            )}
            <Box grow gap="paragraph">
                <Stack>
                    <RichTextPreview
                        key={props.highligtTerms?.join('')}
                        highlightTerms={props.highligtTerms}
                        mentions={content.mentions}
                        channels={channels}
                        content={getMessageBody(result.event.eventId, content)}
                        statusAnnotation={
                            content.editsEventId !== undefined
                                ? 'edited'
                                : result.event.status === EventStatus.NOT_SENT
                                ? 'not-sent'
                                : undefined
                        }
                    />
                </Stack>
                {isMessageSearch ? (
                    <Stack
                        horizontal
                        grow
                        justifyContent="spaceBetween"
                        fontSize="sm"
                        color="gray2"
                    >
                        <Text size="sm">
                            {
                                <UserList
                                    excludeSelf
                                    userIds={userIds}
                                    renderUser={({ displayName, userId }) => (
                                        <Box display="inline" key={userId}>
                                            {displayName}
                                        </Box>
                                    )}
                                />
                            }
                        </Text>
                    </Stack>
                ) : (
                    <Stack
                        horizontal
                        grow
                        justifyContent="spaceBetween"
                        fontSize="sm"
                        color="gray2"
                    >
                        <Text size="sm">
                            {displayName} &middot; {date}
                        </Text>
                        <Text size="sm">{channelLabel}</Text>
                    </Stack>
                )}
            </Box>
            {isMessageSearch && (
                <Box width="x6" shrink={false}>
                    <Text size="xs" color="gray2">
                        {formatShortDate(timestamp)}
                    </Text>
                </Box>
            )}
        </Box>
    )

    if (link) {
        return (
            <NavLink
                to={link}
                ref={ref}
                className={atoms({ flexGrow: 'x1', padding: 'md', inset: 'sm' })}
            >
                {item}
            </NavLink>
        )
    } else {
        return item
    }
}
