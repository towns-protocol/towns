import React from 'react'
import { Link } from 'react-router-dom'
import { AvatarWithoutDot } from '@components/Avatar/Avatar'
import { Box, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useCreateLink } from 'hooks/useCreateLink'
import { isRoomMessage } from '@components/MessageTimeline/util/getEventsByDate'
import { MessageAttachments } from '@components/MessageAttachments/MessageAttachments'
import { MessageAttachmentsContext } from '@components/MessageAttachments/MessageAttachmentsContext'

type Props = {
    eventId: string
}

export const QuotedMessage = (props: Props) => {
    const { eventId } = props
    const { isTouch } = useDevice()
    const timelineContext = useTimelineContext()
    const { createLink } = useCreateLink()
    const event = timelineContext.events.find((e) => e.eventId === eventId)

    if (!event) {
        return <Box>Quoted message not found</Box>
    } else if (!isRoomMessage(event)) {
        return <Box>No preview available</Box>
    }

    const displayName = getPrettyDisplayName(timelineContext?.membersMap[event.sender.id])

    const threadLink =
        createLink({
            ...(timelineContext.spaceId ? { spaceId: timelineContext.spaceId } : {}),
            messageId: timelineContext.channelId,
        }) + `#${eventId}`

    const attachments = isRoomMessage(event) ? event.content.attachments : undefined

    return (
        <Box gap="sm">
            <Link to={threadLink}>
                <Box
                    shrink
                    hoverable
                    background="level2"
                    maxWidth={isTouch ? '300' : '500'}
                    padding="paragraph"
                    rounded="md"
                    width="fit-content"
                    gap="paragraph"
                >
                    <Box horizontal gap="xs" color="gray2">
                        <Box display="inline-block" width="paragraph" insetTop="2">
                            <AvatarWithoutDot userId={event.sender.id} size="avatar_paragraph" />
                        </Box>
                        <Text
                            as="span"
                            display="inline"
                            fontWeight="medium"
                            size="sm"
                            color="gray1"
                        >
                            {displayName}
                        </Text>

                        <Text truncate as="span" display="inline" size="sm">
                            {event.content.body}
                        </Text>
                    </Box>
                    <MessageAttachmentsContext.Provider
                        value={{ isMessageAttachementContext: true }}
                    >
                        {attachments && attachments.length > 0 && (
                            <MessageAttachments attachments={attachments} />
                        )}
                    </MessageAttachmentsContext.Provider>
                </Box>
            </Link>
        </Box>
    )
}
