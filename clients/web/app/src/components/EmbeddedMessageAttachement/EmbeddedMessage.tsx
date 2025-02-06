import {
    EmbeddedMessageAttachment,
    MessageType,
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from '@river-build/sdk'
import React, { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useChannelWithId, useUserLookupContext } from 'use-towns-client'
import { MessageAttachmentsContext } from '@components/MessageAttachments/MessageAttachmentsContext'
import { RichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { Box, Paragraph, Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { formatDate } from 'utils/formatDates'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { useCreateLink } from 'hooks/useCreateLink'
import { AvatarWithoutDot } from '@components/Avatar/Avatar'
import { useMessageLink } from '@components/MessageTimeline/hooks/useFocusItem'

export const EmbeddedMessage = (props: {
    attachment: EmbeddedMessageAttachment
    attachmentChildren?: React.ReactNode
}) => {
    const { attachment } = props
    const attachedMessage =
        attachment.channelMessageEvent?.content?.msgType === MessageType.Text
            ? attachment.channelMessageEvent
            : undefined

    const channel = useChannelWithId(attachment.info.channelId)
    const { lookupUser } = useUserLookupContext()
    const user = lookupUser(attachment.info.userId)

    const { createLink } = useCreateLink()
    const userTooltip = user ? <ProfileHoverCard userId={attachment.info.userId} /> : undefined
    const navigate = useNavigate()

    const onUserClick = useCallback(() => {
        if (user) {
            const link = createLink({ profileId: user.userId })
            if (link) {
                navigate(link)
            }
        }
    }, [createLink, navigate, user])

    const channelType =
        !channel?.id || !isDMChannelStreamId(channel?.id) || !isGDMChannelStreamId(channel?.id)
            ? `Direct Message`
            : `Private Channel`

    const isKnownChannel = !!channel?.id
    const isDM =
        isDMChannelStreamId(attachment.info.channelId) ||
        isGDMChannelStreamId(attachment.info.channelId)

    const messageLinkRoot = isKnownChannel
        ? isDM
            ? createLink({ messageId: attachment.info.channelId })
            : createLink({ spaceId: attachment.info.spaceId, channelId: attachment.info.channelId })
        : undefined

    const messageLink = useMessageLink(
        `${window.location.origin}${messageLinkRoot}#${attachment.info.messageId}`,
    )

    const channelName =
        isDM || !isKnownChannel || !channel?.label ? `${channelType}` : `#${channel?.label}`

    if (!attachedMessage) {
        return null
    }

    return (
        <MessageAttachmentsContext.Provider value={{ isMessageAttachementContext: true }}>
            <Box gap padding background="level2" rounded="sm">
                <Stack
                    horizontal
                    gap="sm"
                    alignItems="center"
                    tooltip={userTooltip}
                    width="min-content"
                    cursor={userTooltip ? 'pointer' : 'default'}
                    onClick={onUserClick}
                >
                    <AvatarWithoutDot userId={attachment.info.userId} size="avatar_xs" />

                    {user ? (
                        <>
                            <Paragraph strong color="gray1" size="sm" whiteSpace="nowrap">
                                {getPrettyDisplayName(user)}{' '}
                            </Paragraph>
                        </>
                    ) : (
                        <Paragraph strong color="gray1" size="sm">
                            {getPrettyDisplayName({
                                userId: attachment.info.userId,
                                username: attachment.staticInfo?.userName,
                                displayName: attachment.staticInfo?.displayName ?? '',
                            })}{' '}
                            {attachment.staticInfo?.userName
                                ? `(${shortAddress(attachment.info.userId)})`
                                : ``}
                        </Paragraph>
                    )}
                </Stack>
                <Box gap="md">
                    {attachedMessage.body && (
                        <RichTextPreview
                            content={attachedMessage.body}
                            mentions={attachedMessage.mentions}
                        />
                    )}
                    {props.attachmentChildren}
                </Box>

                <Stack
                    horizontal
                    gap="sm"
                    color="gray2"
                    alignItems="center"
                    fontSize="sm"
                    flexWrap="wrap"
                >
                    {isKnownChannel && channelName ? (
                        <>
                            <Text size={{ desktop: 'sm', mobile: 'xs' }} whiteSpace="nowrap">
                                {channelName}
                            </Text>
                            <Text>&bull;</Text>
                        </>
                    ) : (
                        <></>
                    )}

                    <Text size={{ desktop: 'sm', mobile: 'xs' }} whiteSpace="nowrap">
                        {formatDate(Number(attachment.info.createdAtEpochMs))}
                    </Text>
                    {messageLink.type && <Text>&bull;</Text>}
                    {messageLink.type === 'internal-link' && (
                        <Link to={messageLink.path}>
                            <Text
                                size={{ desktop: 'sm', mobile: 'xs' }}
                                whiteSpace="nowrap"
                                color="cta2"
                            >
                                View Message
                            </Text>
                        </Link>
                    )}
                    {messageLink.type === 'same-channel-message' && (
                        <Box
                            as="a"
                            style={{ cursor: 'pointer' }}
                            onClick={() => messageLink.focusMessage()}
                        >
                            <Text
                                size={{ desktop: 'sm', mobile: 'xs' }}
                                whiteSpace="nowrap"
                                color="cta2"
                            >
                                View Message
                            </Text>
                        </Box>
                    )}
                </Stack>
            </Box>
        </MessageAttachmentsContext.Provider>
    )
} // https://localhost:3000/t//channels/883694f664c498beb7f2424337f3b8182c130c73cbdf42ecb089c1459e570f10#e241f9471d14095577513ec73a9c7a4eb59989f950cf8c7116910772a7c34978
