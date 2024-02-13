import React, { useContext } from 'react'
import {
    Attachment,
    ChunkedMediaAttachment,
    EmbeddedMessageAttachment,
    MessageType,
} from 'use-zion-client'
import { ChunkedFile } from '@components/ChunkedFile/ChunkedFile'
import { EmbeddedMessage } from '@components/EmbeddedMessageAttachement/EmbeddedMessage'
import { Stack } from '@ui'
import { isMediaMimeType } from 'utils/isMediaMimeType'
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
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onAttachmentClick?.(attachment.id)
                            }}
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
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onAttachmentClick?.(attachment.id)
                            }}
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
