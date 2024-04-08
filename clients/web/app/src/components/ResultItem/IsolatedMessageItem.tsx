import React, { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
    EventStatus,
    MentionResult as MessageResult,
    useSpaceId,
    useTimelineReactions,
    useUserLookupContext,
} from 'use-towns-client'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import { MessageLayout } from '@components/MessageLayout'
import { RichTextPreview } from '@components/RichText/RichTextPreview'
import { RichTextPreview as PlateRichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { env } from 'utils'
import { Box, BoxProps } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { PATHS } from 'routes'
import { atoms } from 'ui/styles/atoms.css'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { getIsRoomMessageContent, getMessageBody } from 'utils/ztevent_util'
import { useDmChannels } from 'hooks/useDMChannels'
import { useHandleReaction } from 'hooks/useReactions'

const createMessageLink = (
    spaceId: string,
    channelId: string,
    eventId: string,
    isTouch: boolean,
    threadId?: string,
) => {
    if (isTouch) {
        if (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)) {
            return `/${PATHS.SPACES}/${spaceId}/${PATHS.MESSAGES}/${channelId}/#${eventId}`
        }
    }
    const channelSegment = `/${PATHS.SPACES}/${spaceId}/${PATHS.CHANNELS}/${channelId}/`
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
    const channelSlug = result.channel.id

    const content = getIsRoomMessageContent(result.event)

    const { usersMap, users } = useUserLookupContext()
    const channels = useSpaceChannels()
    const dmChannels = useDmChannels()

    const sender = usersMap[result.event.sender.id]
    const ref = React.useRef<HTMLAnchorElement>(null)

    const link = useMemo(() => {
        if (!spaceSlug || !channelSlug) {
            return undefined
        }
        return createMessageLink(
            spaceSlug,
            result.channel.id,
            result.event.eventId,
            isTouch,
            result.thread?.eventId,
        )
    }, [channelSlug, result.channel.id, result.event.eventId, result.thread, spaceSlug, isTouch])

    useEffect(() => {
        if (props.selected && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [props.selected])

    const messageReactionsMap = useTimelineReactions(result.channel.id)
    const reactions = messageReactionsMap[result.event.eventId]
    const onReaction = useHandleReaction(result.channel.id)

    if (!content) {
        return null
    }

    const sourceAnnotation =
        result.channel.label.length > 0
            ? `${result.thread ? `Thread in` : ``} #${result.channel.label.toLowerCase()}`
            : ''

    const MessagePreview = env.VITE_ENABLE_SLATE_PREVIEW ? PlateRichTextPreview : RichTextPreview

    const item = (
        <Box
            overflow="hidden"
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
                <MessagePreview
                    key={props.highligtTerms?.join('')}
                    highlightTerms={props.highligtTerms}
                    members={users}
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
