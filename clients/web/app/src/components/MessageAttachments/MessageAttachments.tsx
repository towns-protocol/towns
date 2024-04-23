import React, { useContext } from 'react'
import {
    Attachment,
    ChunkedMediaAttachment,
    EmbeddedMessageAttachment,
    MessageType,
    UnfurledLinkAttachment,
} from 'use-towns-client'
import { ChunkedFile } from '@components/ChunkedFile/ChunkedFile'
import { EmbeddedMessage } from '@components/EmbeddedMessageAttachement/EmbeddedMessage'
import { Box, Stack, Text } from '@ui'
import { isMediaMimeType } from 'utils/isMediaMimeType'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { MessageAttachmentsContext } from './MessageAttachmentsContext'

const emptyArray: never[] = []

export const MessageAttachments = (props: {
    attachments: Attachment[] | undefined
    onClick?: (e: React.MouseEvent) => void
    onAttachmentClick?: (streamId: string) => void
}) => {
    const { onAttachmentClick, attachments, onClick } = props

    // prevent recursive rendering of message attachments
    const isMessageAttachementContext =
        useContext(MessageAttachmentsContext)?.isMessageAttachementContext

    if (!attachments) {
        return null
    }

    const mediaAttachments = attachments.filter(isRichMediaAttachment)
    const fileAttachments = attachments.filter(isRegularFileAttachment)
    const unfurledLinkAttachments = attachments.filter(isUnfurledLinkAttachment)
    const messageAttachments = isMessageAttachementContext
        ? emptyArray
        : attachments?.filter(isEmbeddedMessageAttachment)

    return (
        <>
            {mediaAttachments.length > 0 && (
                <Stack horizontal gap="sm" flexWrap="wrap" onClick={onClick}>
                    {mediaAttachments.map((attachment) => (
                        <ChunkedFile
                            key={attachment.streamId}
                            mimetype={attachment.info.mimetype}
                            width={attachment.info.widthPixels}
                            height={attachment.info.heightPixels}
                            filename={attachment.info.filename}
                            streamId={attachment.streamId}
                            iv={attachment.encryption.iv}
                            secretKey={attachment.encryption.secretKey}
                            thumbnail={attachment.thumbnail?.content}
                            onClick={
                                onAttachmentClick
                                    ? (e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          onAttachmentClick?.(attachment.id)
                                      }
                                    : undefined
                            }
                        />
                    ))}
                </Stack>
            )}
            {fileAttachments.length > 0 && (
                <Stack horizontal gap="sm" flexWrap="wrap">
                    {fileAttachments.map((attachment) => (
                        <ChunkedFile
                            key={attachment.streamId}
                            mimetype={attachment.info.mimetype}
                            width={attachment.info.widthPixels}
                            height={attachment.info.heightPixels}
                            filename={attachment.info.filename}
                            streamId={attachment.streamId}
                            iv={attachment.encryption.iv}
                            secretKey={attachment.encryption.secretKey}
                            onClick={
                                onAttachmentClick
                                    ? (e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          onAttachmentClick?.(attachment.id)
                                      }
                                    : undefined
                            }
                        />
                    ))}
                </Stack>
            )}

            {messageAttachments?.length > 0 && (
                <Stack gap="sm">
                    {messageAttachments.map((attachment) => (
                        <EmbeddedMessageContainer
                            key={attachment.id}
                            attachment={attachment}
                            onAttachmentClick={onAttachmentClick}
                            onClick={onClick}
                        />
                    ))}
                </Stack>
            )}
            {unfurledLinkAttachments.length > 0 && (
                <Box horizontal gap="sm" flexWrap="wrap" width="100%">
                    {unfurledLinkAttachments.map((attachment) => (
                        <UnfurledLinkAttachmentContainer key={attachment.id} {...attachment} />
                    ))}
                </Box>
            )}
        </>
    )
}

export function trimMessageBodyLinks(messageBody: string) {
    return messageBody.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '...')
}

export function isRichMediaAttachment(
    attachment: Attachment,
): attachment is ChunkedMediaAttachment {
    return attachment.type === 'chunked_media' && isMediaMimeType(attachment.info.mimetype)
}

function isRegularFileAttachment(attachment: Attachment): attachment is ChunkedMediaAttachment {
    return attachment.type === 'chunked_media' && !isMediaMimeType(attachment.info.mimetype)
}

function isUnfurledLinkAttachment(attachment: Attachment): attachment is UnfurledLinkAttachment {
    return attachment.type === 'unfurled_link'
}

export function isEmbeddedMessageAttachment(
    attachment: Attachment,
): attachment is EmbeddedMessageAttachment {
    return attachment.type === 'embedded_message'
}

// need this pattern to avoid circular dependency
const EmbeddedMessageContainer = (props: {
    attachment: EmbeddedMessageAttachment
    onClick?: (e: React.MouseEvent) => void
    onAttachmentClick?: (attachmentId: string) => void
}) => {
    const { attachment } = props
    const attachedMessage =
        attachment.roomMessageEvent?.content?.msgType === MessageType.Text
            ? attachment.roomMessageEvent
            : undefined

    if (!attachedMessage) {
        return null
    }

    return (
        <EmbeddedMessage
            attachment={attachment}
            attachmentChildren={
                <MessageAttachments
                    attachments={attachment.roomMessageEvent?.attachments}
                    onAttachmentClick={props.onAttachmentClick}
                    onClick={props.onClick}
                />
            }
        />
    )
}

const UnfurledLinkAttachmentContainer = (props: UnfurledLinkAttachment) => {
    return (
        <Box
            as="a"
            href={props.url}
            rel="noopener noreferrer"
            target="_blank"
            alignSelf="start"
            background="level3"
            padding="md"
            borderRadius="sm"
            gap="md"
            maxWidth="300"
        >
            {props.image?.url && (
                <RatioedBackgroundImage
                    alt={props.title}
                    url={props.image.url}
                    width={props.image.width}
                    height={props.image.height}
                />
            )}
            <Box>
                <Text size="md">{props.title}</Text>
            </Box>
            <Text size="sm" color="gray2">
                {props.description}
            </Text>
            <Box hoverable color={{ hover: 'default', default: 'cta2' }} maxWidth="100%">
                <Text
                    fontWeight="medium"
                    size="sm"
                    style={{
                        overflowWrap: 'break-word',
                    }}
                >
                    {props.url}
                </Text>
            </Box>
        </Box>
    )
}
