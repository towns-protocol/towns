import { EventStatus } from 'matrix-js-sdk'
import React, { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
    MentionResult as MessageResult,
    RoomIdentifier,
    useSpaceId,
    useSpaceMembers,
} from 'use-zion-client'
import { MessageLayout } from '@components/MessageLayout'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { Box, BoxProps } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { PATHS } from 'routes'
import { atoms } from 'ui/styles/atoms.css'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { getIsRoomMessageContent, getMessageBody } from 'utils/ztevent_util'

const createMessageLink = (
    spaceId: string,
    channelId: RoomIdentifier,
    eventId: string,
    threadId?: string,
) => {
    const channelSegment = `/${PATHS.SPACES}/${spaceId}/${PATHS.CHANNELS}/${channelId.networkId}/`
    const threadSegment = threadId ? `${PATHS.REPLIES}/${threadId}/` : ``
    const eventSegment = `#${eventId}`
    return `${channelSegment}${threadSegment}${eventSegment}`
}

export const IsolatedMessageItem = (
    props: {
        result: MessageResult
        userId?: string
        highligtTerms?: string[]
    } & BoxProps,
) => {
    const { result, padding = { touch: 'md', default: 'lg' } } = props
    const { isTouch } = useDevice()
    const { slug: spaceSlug } = useSpaceId() ?? {}
    const { slug: channelSlug } = result.channel.id

    const content = getIsRoomMessageContent(result.event)

    const { membersMap, members } = useSpaceMembers()
    const channels = useSpaceChannels()
    const sender = membersMap[result.event.sender.id]
    const ref = React.useRef<HTMLAnchorElement>(null)

    const link = useMemo(() => {
        if (!spaceSlug || !channelSlug) {
            return undefined
        }
        return createMessageLink(
            spaceSlug,
            result.channel.id,
            result.event.eventId,
            result.thread?.eventId,
        )
    }, [channelSlug, result.channel.id, result.event.eventId, result.thread, spaceSlug])

    useEffect(() => {
        if (props.selected && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [props.selected])

    if (!content) {
        return null
    }

    const item = (
        <Box
            hoverable
            overflow="hidden"
            background={props.selected ? 'level3' : 'level2'}
            elevate={!isTouch}
            rounded="sm"
        >
            <MessageLayout
                relativeDate
                background="inherit"
                tabIndex={-1}
                avatarSize={isTouch ? 'avatar_x4' : 'avatar_md'}
                padding={padding}
                key={result.event.eventId}
                messageSourceAnnotation={`${
                    result.thread ? `Thread in` : ``
                } #${result.channel.label.toLowerCase()}`}
                timestamp={result.event.createdAtEpocMs}
                userId={sender?.userId}
                senderId={sender?.userId}
                name={getPrettyDisplayName(sender).name}
            >
                <RichTextPreview
                    key={props.highligtTerms?.join('')}
                    highlightTerms={props.highligtTerms}
                    members={members}
                    channels={channels}
                    content={getMessageBody(result.event.eventId, content)}
                    statusAnnotation={
                        content.replacedMsgId !== undefined
                            ? 'edited'
                            : result.event.status === EventStatus.NOT_SENT
                            ? 'not-sent'
                            : undefined
                    }
                />
            </MessageLayout>
        </Box>
    )

    if (link) {
        return (
            <NavLink to={link} ref={ref} className={atoms({ rounded: 'sm' })}>
                {item}
            </NavLink>
        )
    } else {
        return item
    }
}
