import { RelationType } from 'matrix-js-sdk'
import React from 'react'
import { NavLink } from 'react-router-dom'
import {
    MentionResult,
    useMatrixCredentials,
    useSpaceId,
    useSpaceMembers,
    useSpaceMentions,
} from 'use-zion-client'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { Message } from '@components/Message'
import { getIsRoomMessageContent, getMessageBody } from 'utils/ztevent_util'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const SpaceMentions = () => {
    const { userId } = useMatrixCredentials()
    const mentions = useSpaceMentions()

    return (
        <CentralPanelLayout>
            <Stack absoluteFill overflowY="scroll">
                {mentions.length ? (
                    <Stack grow gap>
                        <Stack>
                            {mentions.map((m, index, mentions) => {
                                return (
                                    m.type === 'mention' && (
                                        <MentionBox
                                            mention={m}
                                            key={m.event.eventId}
                                            userId={userId}
                                        />
                                    )
                                )
                            })}
                        </Stack>
                    </Stack>
                ) : (
                    <Stack centerContent grow>
                        <Stack centerContent gap="lg" width="250">
                            <Box padding="md" color="gray2" background="level2" rounded="sm">
                                <Icon type="at" size="square_sm" />
                            </Box>
                            <Heading level={3}>No mentions yet</Heading>
                            <Paragraph textAlign="center" color="gray2">
                                {`Whenever someone "@" mentions you, it'll show up here.`}
                            </Paragraph>
                        </Stack>
                    </Stack>
                )}
            </Stack>
        </CentralPanelLayout>
    )
}

const MentionBox = (props: { mention: MentionResult; userId?: string }) => {
    const { mention, userId } = props
    const { slug: spaceSlug } = useSpaceId() ?? {}
    const { slug: channelSlug } = mention.channel.id

    const content = getIsRoomMessageContent(mention.event)

    const { membersMap } = useSpaceMembers()
    const user = membersMap[mention.event.sender.id]

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
                    userId={userId}
                    avatar={user.avatarUrl}
                    name={user.name}
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
