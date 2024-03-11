import { Attachment, EmbeddedMessageAttachment, useUserLookupContext } from 'use-towns-client'
import React, { useCallback } from 'react'
import { Box, IconButton, Paragraph } from '@ui'
import { RichTextPreview } from '@components/RichText/RichTextPreview'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { MessageAttachments } from '@components/MessageAttachments/MessageAttachments'
import { MessageAttachmentsContext } from '@components/MessageAttachments/MessageAttachmentsContext'
import { FadeInBox } from '@components/Transitions'

type Props = {
    attachment: EmbeddedMessageAttachment
    onRemove: (attachmentId: string) => void
}

export const MessageAttachmentPreview = (props: Props) => {
    const { attachment, onRemove } = props
    const roomMessageEvent = attachment.roomMessageEvent

    const { usersMap } = useUserLookupContext()

    const onRemoveClick = useCallback(() => {
        onRemove(attachment.id)
    }, [attachment.id, onRemove])

    if (!roomMessageEvent) {
        return
    }

    const displayName = getPrettyDisplayName(usersMap[attachment.info.userId])

    return (
        <MessageAttachmentsContext.Provider value={{ isMessageAttachementContext: true }}>
            <EditorAttachmentPreview
                type="forward"
                attachments={roomMessageEvent.attachments}
                displayName={displayName}
                body={roomMessageEvent.body}
                onRemoveClick={onRemoveClick}
            />
        </MessageAttachmentsContext.Provider>
    )
}

export const EditorAttachmentPreview = (props: {
    type: 'forward' | 'reply'
    displayName: string
    body: string
    attachments?: Attachment[]
    onRemoveClick: () => void
}) => {
    const messageAbstract = getShortTextFromMarkdown(props.body)
    return (
        <FadeInBox
            horizontal
            grow
            padding="md"
            background="level3"
            rounded="sm"
            boxShadow="panel"
            preset="fadeup"
        >
            <Box grow gap="paragraph">
                <Paragraph strong color="gray1">
                    {props.type === 'forward' ? 'Forward' : 'Reply to'} {props.displayName}
                    &#39;s message:
                </Paragraph>
                {messageAbstract && <RichTextPreview content={messageAbstract} />}
                {props.attachments?.length ? (
                    <Box>
                        <MessageAttachments attachments={props.attachments} />
                    </Box>
                ) : (
                    <></>
                )}
            </Box>
            <Box>
                <IconButton icon="close" color="default" onClick={props.onRemoveClick} />
            </Box>
        </FadeInBox>
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
