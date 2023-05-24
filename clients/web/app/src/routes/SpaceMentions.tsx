import React from 'react'
import { NavLink } from 'react-router-dom'
import {
    EventStatus,
    MentionResult,
    useMatrixCredentials,
    useSpaceId,
    useSpaceMembers,
    useSpaceMentions,
} from 'use-zion-client'
import { PATHS } from 'routes'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { Message } from '@components/MessageLayout'
import { getIsRoomMessageContent, getMessageBody } from 'utils/ztevent_util'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { TouchLayoutNavigationBar } from '@components/TouchLayoutNavigationBar/TouchLayoutNavigationBar'
import { useDevice } from 'hooks/useDevice'
import { FadeInBox } from '@components/Transitions'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const SpaceMentions = () => {
    const { userId } = useMatrixCredentials()
    const mentions = useSpaceMentions()
    const { isMobile } = useDevice()

    return (
        <CentralPanelLayout>
            {isMobile && <TouchLayoutNavigationBar value="mentions" />}
            <Stack absoluteFill scroll paddingTop={isMobile ? 'x8' : 'none'}>
                {mentions.length ? (
                    <Stack grow minHeight="100svh">
                        <Stack gap padding="lg">
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
                    <Stack centerContent grow absoluteFill scroll>
                        <Stack centerContent gap="lg" width="250" minHeight="100svh">
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
    const { mention } = props
    const { slug: spaceSlug } = useSpaceId() ?? {}
    const { slug: channelSlug } = mention.channel.id

    const content = getIsRoomMessageContent(mention.event)

    const { membersMap } = useSpaceMembers()
    const sender = membersMap[mention.event.sender.id]

    if (!content) {
        return null
    }

    const channelSegment = `/${PATHS.SPACES}/${spaceSlug}/channels/${channelSlug}`
    const threadSegment = mention.thread ? `/replies/${mention.thread.eventId}` : ``
    const eventSegment = `#${mention.event.eventId}`
    const link = `${channelSegment}${threadSegment}${eventSegment}`

    return (
        <NavLink to={link}>
            <FadeInBox
                elevate
                hoverable
                rounded="md"
                background={mention.unread ? 'level3' : 'level2'}
                cursor="alias"
                boxShadow="card"
                overflow="hidden"
            >
                <Message
                    relativeDate
                    padding="lg"
                    key={mention.event.eventId}
                    messageSourceAnnotation={`${
                        mention.thread ? `Thread in` : ``
                    } #${mention.channel.label.toLowerCase()}`}
                    timestamp={mention.event.originServerTs}
                    userId={sender.userId}
                    senderId={sender.userId}
                    name={getPrettyDisplayName(sender).name}
                >
                    <RichTextPreview
                        content={getMessageBody(mention.event.eventId, content)}
                        statusAnnotation={
                            content.replacedMsgId !== undefined
                                ? 'edited'
                                : mention.event.status === EventStatus.NOT_SENT
                                ? 'not-sent'
                                : undefined
                        }
                    />
                </Message>
            </FadeInBox>
        </NavLink>
    )
}
