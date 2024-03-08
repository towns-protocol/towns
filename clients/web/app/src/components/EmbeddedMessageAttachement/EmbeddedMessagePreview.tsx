import { EmbeddedMessageAttachment, useUserLookupContext } from 'use-towns-client'
import React, { useCallback } from 'react'
import { Box, IconButton, Paragraph } from '@ui'
import { RichTextPreview } from '@components/RichText/RichTextPreview'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { MessageAttachments } from '@components/MessageAttachments/MessageAttachments'
import { MessageAttachmentsContext } from '@components/MessageAttachments/MessageAttachmentsContext'

type Props = {
    attachment: EmbeddedMessageAttachment
    onRemove: (attachmentId: string) => void
}
export const EmbeddedMessagePreview = (props: Props) => {
    const { attachment, onRemove } = props
    const roomMessageEvent = attachment.roomMessageEvent

    const { usersMap } = useUserLookupContext()

    const onRemoveClick = useCallback(() => {
        onRemove(attachment.id)
    }, [attachment.id, onRemove])

    if (!roomMessageEvent) {
        return
    }

    const messageAbstract = getShortTextFromMarkdown(roomMessageEvent.body)

    return (
        <MessageAttachmentsContext.Provider value={{ isMessageAttachementContext: true }}>
            <Box horizontal padding grow background="level3" rounded="sm" boxShadow="panel">
                <Box grow gap>
                    <Paragraph strong color="gray2">
                        Forward {getPrettyDisplayName(usersMap[attachment.info.userId])}
                        &#39;s message:
                    </Paragraph>
                    {messageAbstract && <RichTextPreview content={messageAbstract} />}
                    {roomMessageEvent?.attachments?.length ? (
                        <Box>
                            <MessageAttachments attachments={roomMessageEvent.attachments} />
                        </Box>
                    ) : (
                        <></>
                    )}
                </Box>
                <Box>
                    <IconButton icon="close" onClick={onRemoveClick} />
                </Box>
            </Box>
        </MessageAttachmentsContext.Provider>
    )
}

function getShortTextFromMarkdown(markdown: string, maxChars = 200): string {
    const plainText = markdown
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italics
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove inline code

    if (
        plainText.length > maxChars &&
        plainText[maxChars - 1].match(/\S/) &&
        plainText[maxChars]?.match(/\S/)
    ) {
        // Find the last space before the 200th character to avoid cutting off a word
        const uptoLastWord = plainText.substring(0, maxChars).lastIndexOf(' ')
        return plainText.substring(0, uptoLastWord).trim() + '...'
    }

    return plainText.substring(0, maxChars).trim()
}
