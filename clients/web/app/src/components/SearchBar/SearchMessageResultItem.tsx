import React, { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
    EventStatus,
    MentionResult as MessageResult,
    RoomIdentifier,
    useSpaceId,
    useSpaceMembers,
} from 'use-zion-client'
import { formatDistance } from 'date-fns'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { Box, BoxProps, Stack, Text } from '@ui'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { PATHS } from 'routes'
import { atoms } from 'ui/styles/atoms.css'
import { getIsRoomMessageContent, getMessageBody } from 'utils/ztevent_util'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'

const createMessageLink = (
    channelId: RoomIdentifier,
    eventId: string,
    threadId?: string,
    spaceId?: string,
) => {
    if (isDMChannelStreamId(channelId.networkId) || isGDMChannelStreamId(channelId.networkId)) {
        return `/${PATHS.MESSAGES}/${channelId.networkId}/#${eventId}`
    }

    if (!spaceId) {
        return undefined
    }
    const channelSegment = `/${PATHS.SPACES}/${spaceId}/${PATHS.CHANNELS}/${channelId.networkId}/`
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
    const { slug: spaceSlug } = useSpaceId() ?? {}
    const content = getIsRoomMessageContent(result.event)

    const { membersMap, members } = useSpaceMembers()
    const channels = useSpaceChannels()
    const sender = membersMap[result.event.sender.id]
    const ref = React.useRef<HTMLAnchorElement>(null)

    const displayName = getPrettyDisplayName(sender).displayName

    const link = useMemo(() => {
        return createMessageLink(
            result.channel.id,
            result.event.eventId,
            result.thread?.eventId,
            spaceSlug,
        )
    }, [result.channel.id, result.event.eventId, result.thread, spaceSlug])

    useEffect(() => {
        if (props.selected && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [props.selected])

    if (!content) {
        return null
    }

    const channelLabel =
        result.channel.label.length > 0
            ? `${result.thread ? `Thread in` : ``} #${result.channel.label.toLowerCase()}`
            : ''

    const timestamp = result.event.createdAtEpocMs

    const date = timestamp
        ? `${formatDistance(timestamp, Date.now(), {
              addSuffix: true,
          })}`
        : undefined

    const item = (
        <Box gap horizontal grow>
            <Box width="x4">
                <Avatar userId={sender?.userId} size="avatar_x4" />
            </Box>
            <Box grow gap="paragraph">
                <Stack>
                    <RichTextPreview
                        key={props.highligtTerms?.join('')}
                        highlightTerms={props.highligtTerms}
                        members={members}
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
                <Stack horizontal grow justifyContent="spaceBetween" fontSize="sm" color="gray2">
                    <Text size="sm">
                        {displayName} &middot; {date}
                    </Text>
                    <Text size="sm">{channelLabel}</Text>
                </Stack>
            </Box>
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
