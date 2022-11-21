import { RelationType } from 'matrix-js-sdk'
import React from 'react'
import { Outlet } from 'react-router'
import { NavLink } from 'react-router-dom'
import { MentionResult, useSpaceId, useSpaceMentions } from 'use-zion-client'
import { Box, Stack } from '@ui'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { Message } from '@components/Message'
import { getIsRoomMessageContent, getMessageBody } from 'utils/ztevent_util'

export const SpaceMentions = () => {
    const result = useSpaceMentions()
    return (
        <Stack grow horizontal>
            <Stack grow gap>
                <Stack>
                    {result.map((m, index, mentions) => {
                        return (
                            m.type === 'mention' && <MentionBox mention={m} key={m.event.eventId} />
                        )
                    })}
                </Stack>
            </Stack>
            <Outlet />
        </Stack>
    )
}

const MentionBox = (props: { mention: MentionResult }) => {
    const { mention } = props
    const { slug: spaceSlug } = useSpaceId() ?? {}
    const { slug: channelSlug } = mention.channel.id

    const content = getIsRoomMessageContent(mention.event)

    if (!content) {
        return null
    }

    const channelSegment = `/spaces/${spaceSlug}/channels/${channelSlug}`
    const threadSegment = mention.thread ? `/replies/${mention.thread.eventId}` : ``
    const eventSegment = `#${mention.event.eventId}`
    const link = `${channelSegment}${threadSegment}${eventSegment}`

    return (
        <NavLink to={link}>
            <Box rounded="xs" background={mention.unread ? 'level2' : undefined} cursor="alias">
                <Message
                    relativeDate
                    padding="lg"
                    key={mention.event.eventId}
                    messageSourceAnnotation={`${
                        mention.thread ? `Thread in` : ``
                    } #${mention.channel.label.toLowerCase()}`}
                    timestamp={mention.event.originServerTs}
                    userId={content.sender.id}
                    avatar={content.sender.avatarUrl}
                    name={content.sender.displayName}
                >
                    <RichTextPreview
                        content={getMessageBody(mention.event.eventId, content)}
                        edited={content.content['m.relates_to']?.rel_type === RelationType.Replace}
                    />
                </Message>
            </Box>
        </NavLink>
    )
}
