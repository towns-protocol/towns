import React, { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useSpaceId, useTimelineReactions, useUserLookupContext } from 'use-towns-client'
import {
    EventStatus,
    MentionResult as MessageResult,
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from '@towns-protocol/sdk'
import { MessageLayout } from '@components/MessageLayout'
import { RichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { Box, BoxProps } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { PATHS } from 'routes'
import { atoms } from 'ui/styles/atoms.css'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { getIsChannelMessageContent, getMessageBody } from 'utils/ztevent_util'
import { useDmChannels } from 'hooks/useDMChannels'
import { useHandleReaction } from 'hooks/useReactions'
import { addressFromSpaceId } from 'ui/utils/utils'

const createMessageLink = (
    spaceId: string,
    channelId: string,
    eventId: string,
    isTouch: boolean,
    threadId?: string,
) => {
    if (isTouch) {
        if (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)) {
            return `/${PATHS.SPACES}/${addressFromSpaceId(spaceId)}/${
                PATHS.MESSAGES
            }/${channelId}/#${eventId}`
        }
    }
    const channelSegment = `/${PATHS.SPACES}/${addressFromSpaceId(spaceId)}/${
        PATHS.CHANNELS
    }/${channelId}/`
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
    const { result, padding = { touch: 'md', default: 'lg' }, ...boxProps } = props
    const { isTouch } = useDevice()
    const spaceSlug = useSpaceId() ?? ''
    const channelSlug = result.channelId

    const content = getIsChannelMessageContent(result.event)

    const { lookupUser } = useUserLookupContext()
    const channels = useSpaceChannels()
    const dmChannels = useDmChannels()
    const channel = useMemo(
        () => channels.find((c) => c.id === result.channelId) ?? { label: 'loading...' },
        [channels, result.channelId],
    )
    const sender = lookupUser(result.event.sender.id)
    const ref = React.useRef<HTMLAnchorElement>(null)

    const link = useMemo(() => {
        if (!spaceSlug || !channelSlug) {
            return undefined
        }
        return createMessageLink(
            spaceSlug,
            result.channelId,
            result.event.eventId,
            isTouch,
            result.thread?.eventId,
        )
    }, [channelSlug, result.channelId, result.event.eventId, result.thread, spaceSlug, isTouch])

    useEffect(() => {
        if (props.selected && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [props.selected])

    const messageReactionsMap = useTimelineReactions(result.channelId)
    const reactions = messageReactionsMap[result.event.eventId]
    const onReaction = useHandleReaction(result.channelId)

    if (!content) {
        return null
    }

    const sourceAnnotation =
        channel.label.length > 0
            ? `${result.thread ? `Thread in` : ``} #${channel.label.toLowerCase()}`
            : ''

    const item = (
        <Box
            overflow="hidden"
            data-testid="isolated-message-item"
            background={isTouch ? 'inherit' : props.selected ? 'level3' : 'level2'}
            elevate={!isTouch}
            {...boxProps}
        >
            <MessageLayout
                relativeDate
                background="inherit"
                tabIndex={-1}
                avatarSize="avatar_x4"
                padding={padding}
                key={result.event.eventId}
                messageSourceAnnotation={sourceAnnotation}
                timestamp={result.event.createdAtEpochMs}
                userId={sender?.userId}
                senderId={sender?.userId}
                user={sender}
                name={getPrettyDisplayName(sender)}
                reactions={reactions}
                onReaction={onReaction}
            >
                <RichTextPreview
                    key={props.highligtTerms?.join('')}
                    highlightTerms={props.highligtTerms}
                    mentions={content.mentions}
                    channels={[...channels, ...dmChannels]}
                    content={getMessageBody(result.event.eventId, content)}
                    statusAnnotation={
                        content.editsEventId !== undefined
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
