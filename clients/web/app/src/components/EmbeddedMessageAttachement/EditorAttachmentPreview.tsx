import {
    Attachment,
    EmbeddedMessageAttachment,
    OTWMention,
    UnfurledLinkAttachment,
    useUserLookupContext,
} from 'use-towns-client'
import React, { useCallback } from 'react'
import { Box, IconButton, Paragraph, Stack, Text } from '@ui'
import { RichTextPreview } from '@components/RichText/RichTextPreview'
import { RichTextPreview as PlateRichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { env } from 'utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { MessageAttachments } from '@components/MessageAttachments/MessageAttachments'
import { MessageAttachmentsContext } from '@components/MessageAttachments/MessageAttachmentsContext'
import { FadeInBox } from '@components/Transitions'

type MessageAttachmentPreviewProps = {
    attachment: EmbeddedMessageAttachment
    onRemove: (attachmentId: string) => void
}

export const MessageAttachmentPreview = (props: MessageAttachmentPreviewProps) => {
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
                mentions={roomMessageEvent.mentions}
                onRemoveClick={onRemoveClick}
            />
        </MessageAttachmentsContext.Provider>
    )
}

type UnfurledLinkAttachmentPreviewProps = {
    attachment: UnfurledLinkAttachment
    onRemove: (attachmentId: string) => void
}

export const UnfurledLinkAttachmentPreview = (props: UnfurledLinkAttachmentPreviewProps) => {
    return (
        <MessageAttachmentsContext.Provider value={{ isMessageAttachementContext: true }}>
            <UnfurledLinkPreview attachment={props.attachment} onRemove={props.onRemove} />
        </MessageAttachmentsContext.Provider>
    )
}

export const EditorAttachmentPreview = (props: {
    type: 'forward' | 'reply'
    displayName: string
    body: string
    mentions?: OTWMention[]
    attachments?: Attachment[]
    onRemoveClick: () => void
}) => {
    const messageAbstract = getShortTextFromMarkdown(props.body)
    const MessagePreview = env.VITE_ENABLE_SLATE_PREVIEW ? PlateRichTextPreview : RichTextPreview
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
                {messageAbstract && (
                    <MessagePreview content={messageAbstract} mentions={props.mentions} />
                )}
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

const UnfurledLinkPreview = (props: {
    attachment: UnfurledLinkAttachment
    onRemove?: (attachmentId: string) => void
}) => {
    const { onRemove } = props
    const { url, image, title, description, id } = props.attachment
    const onRemoveClicked = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation()
            event.preventDefault()
            onRemove?.(id)
        },
        [onRemove, id],
    )

    const onClick = useCallback(() => {
        window.open(url, '_blank')
    }, [url])

    return (
        <FadeInBox
            hoverable
            centerContent
            width="250"
            padding="md"
            background="level3"
            rounded="sm"
            boxShadow="panel"
            preset="fadeup"
            position="relative"
            cursor="pointer"
            onClick={onClick}
        >
            <Stack gap="sm" alignContent="center" width="100%">
                <Stack horizontal gap="sm" alignItems="center">
                    {image?.url && <IconImage url={image.url} />}
                    {title && (
                        <Text truncate strong fontSize="sm">
                            {title}
                        </Text>
                    )}
                </Stack>
                {description && (
                    <Box hoverable color={{ hover: 'default', default: 'cta2' }}>
                        <Text truncate fontSize="sm" fontWeight="medium">
                            {description}
                        </Text>
                    </Box>
                )}
            </Stack>
            <Box position="topRight" padding="xxs">
                <IconButton
                    icon="close"
                    color="default"
                    tooltip="Remove"
                    tooltipOptions={{ immediate: true }}
                    onClick={onRemoveClicked}
                />
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

const IconImage = ({ url }: { url: string }) => {
    return (
        <Box
            shrink={false}
            rounded="xs"
            width="x2"
            aspectRatio="1/1"
            style={{
                backgroundImage: `url(${url})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
            }}
        />
    )
}
