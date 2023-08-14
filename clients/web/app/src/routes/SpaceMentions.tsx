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
import { useDevice } from 'hooks/useDevice'
import { FadeInBox } from '@components/Transitions'
import { useHasJoinedChannels } from 'hooks/useHasJoinedChannels'
import { NoJoinedChannelsFallback } from '@components/NoJoinedChannelsFallback'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const SpaceMentions = () => {
    const { userId } = useMatrixCredentials()
    const mentions = useSpaceMentions()
    const { isTouch } = useDevice()
    const { loadingChannels, hasJoinedChannels } = useHasJoinedChannels()

    const renderContent = () => {
        if (loadingChannels) {
            return (
                <>
                    <ButtonSpinner /> Loading...
                </>
            )
        }
        if (hasJoinedChannels) {
            return (
                <>
                    <Box padding="md" color="gray2" background="level2" rounded="sm">
                        <Icon type="at" size="square_sm" />
                    </Box>
                    <Heading level={3}>No mentions yet</Heading>
                    <Paragraph textAlign="center" color="gray2">
                        {`Whenever someone "@" mentions you, it'll show up here.`}
                    </Paragraph>
                </>
            )
        }

        return <NoJoinedChannelsFallback />
    }

    return (
        <CentralPanelLayout>
            {isTouch && <TouchNavBar>Mentions</TouchNavBar>}
            <Stack scroll>
                {mentions.length ? (
                    <Stack minHeight="forceScroll">
                        <Stack
                            gap={{ touch: 'none', default: 'md' }}
                            padding={{ touch: 'none', default: 'lg' }}
                        >
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
                            {renderContent()}
                        </Stack>
                    </Stack>
                )}
            </Stack>
        </CentralPanelLayout>
    )
}

const MentionBox = (props: { mention: MentionResult; userId?: string }) => {
    const { mention } = props
    const { isTouch } = useDevice()
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
                hoverable
                elevate={!isTouch}
                rounded="md"
                background={mention.unread ? 'level3' : 'level2'}
                cursor="alias"
                boxShadow={{ touch: 'none', default: 'card' }}
                overflow="hidden"
            >
                <Message
                    relativeDate
                    avatarSize={isTouch ? 'avatar_x4' : 'avatar_md'}
                    padding={{ touch: 'md', default: 'lg' }}
                    key={mention.event.eventId}
                    messageSourceAnnotation={`${
                        mention.thread ? `Thread in` : ``
                    } #${mention.channel.label.toLowerCase()}`}
                    timestamp={mention.event.originServerTs}
                    userId={sender?.userId}
                    senderId={sender?.userId}
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
