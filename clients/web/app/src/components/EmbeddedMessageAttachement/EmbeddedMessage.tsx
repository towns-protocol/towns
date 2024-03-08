import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import React, { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    EmbeddedMessageAttachment,
    MessageType,
    useRoom,
    useUserLookupContext,
} from 'use-towns-client'
import { MessageAttachmentsContext } from '@components/MessageAttachments/MessageAttachmentsContext'
import { RichTextPreview } from '@components/RichText/RichTextPreview'
import { Box, Paragraph, Stack, Text } from '@ui'
import { PATHS } from 'routes'
import { shortAddress } from 'ui/utils/utils'
import { formatDate } from 'utils/formatDates'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { useCreateLink } from 'hooks/useCreateLink'

export const EmbeddedMessage = (props: {
    attachment: EmbeddedMessageAttachment
    attachmentChildren?: React.ReactNode
}) => {
    const { attachment } = props
    const attachedMessage =
        attachment.roomMessageEvent?.content?.msgType === MessageType.Text
            ? attachment.roomMessageEvent
            : undefined

    const channel = useRoom(attachment.info.channelId)
    const { usersMap } = useUserLookupContext()
    const user = usersMap[attachment.info.userId]

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

    if (!attachedMessage) {
        return null
    }

    const channelType =
        !channel?.id || !isDMChannelStreamId(channel?.id) || !isGDMChannelStreamId(channel?.id)
            ? `Direct Message`
            : `Private Channel`

    const isKnownChannel = !!channel?.id
    const channelName =
        isKnownChannel && !!channel?.name ? `#${channel?.name}` : `From a ${channelType}`

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
                    {user ? (
                        <>
                            <Paragraph strong color="gray1" size="sm">
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
                    {attachedMessage.body && <RichTextPreview content={attachedMessage.body} />}
                    {props.attachmentChildren}
                </Box>

                <Stack horizontal gap="sm" color="gray2" alignItems="center" fontSize="sm">
                    {isKnownChannel && channelName ? (
                        <>
                            <Text size="sm">{channelName}</Text>
                            <Text>&bull;</Text>
                        </>
                    ) : (
                        <></>
                    )}

                    <Text size="sm">{formatDate(Number(attachment.info.createdAtEpocMs))}</Text>
                    {isKnownChannel && (
                        <>
                            <Text>&bull;</Text>
                            <Link
                                to={`/${PATHS.SPACES}/${attachment.info.spaceId}/${PATHS.CHANNELS}/${attachment.info.channelId}#${attachment.info.messageId}`}
                            >
                                <Text size="sm" color="cta2">
                                    View Message
                                </Text>
                            </Link>
                        </>
                    )}
                </Stack>
            </Box>
        </MessageAttachmentsContext.Provider>
    )
}
