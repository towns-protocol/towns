import {
    Attachment,
    EmbeddedMessageAttachment,
    OTWMention,
    UnfurledLinkAttachment,
    useUserLookupContext,
} from 'use-towns-client'
import React, { useCallback } from 'react'
import { Box, IconButton, Paragraph, Stack, Text } from '@ui'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { MessageAttachments } from '@components/MessageAttachments/MessageAttachments'
import { MessageAttachmentsContext } from '@components/MessageAttachments/MessageAttachmentsContext'
import { FadeInBox } from '@components/Transitions'
import { RichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { LoadingUnfurledLinkAttachment } from 'hooks/useExtractInternalLinks'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

type MessageAttachmentPreviewProps = {
    attachment: EmbeddedMessageAttachment
    onRemove: (attachmentId: string) => void
}

export const MessageAttachmentPreview = (props: MessageAttachmentPreviewProps) => {
    const { attachment, onRemove } = props
    const roomMessageEvent = attachment.roomMessageEvent

    const { lookupUser } = useUserLookupContext()

    const onRemoveClick = useCallback(() => {
        onRemove(attachment.id)
    }, [attachment.id, onRemove])

    if (!roomMessageEvent) {
        return
    }

    const displayName = getPrettyDisplayName(lookupUser(attachment.info.userId))

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
                    <RichTextPreview content={messageAbstract} mentions={props.mentions} />
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
    attachment: UnfurledLinkAttachment | LoadingUnfurledLinkAttachment
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

    const isLoading = 'isLoading' in props.attachment && props.attachment.isLoading === true

    return (
        <FadeInBox
            hoverable
            width="250"
            paddingY="sm"
            paddingX="paragraph"
            background="level3"
            rounded="sm"
            boxShadow="panel"
            preset="fadeup"
            position="relative"
            cursor="pointer"
            onClick={onClick}
        >
            <Stack
                gap="xs"
                alignContent="center"
                width="100%"
                color={isLoading ? 'gray2' : 'default'}
            >
                <Stack horizontal gap="sm" alignItems="center">
                    {isLoading && (
                        <Box horizontal gap="sm" alignItems="center" overflow="hidden">
                            <ButtonSpinner height="paragraph" />
                            <Paragraph truncate size="sm">
                                {props.attachment.url}
                            </Paragraph>
                        </Box>
                    )}
                    {image?.url && !!image.height && <IconImage url={image.url} />}
                    {title && (
                        <Text truncate strong fontSize="sm" color="gray1">
                            {title}
                        </Text>
                    )}
                    <Box grow />
                    <IconButton
                        background="lightHover"
                        rounded="full"
                        insetX="xs"
                        size="square_xs"
                        icon="close"
                        color="default"
                        tooltip="Remove"
                        tooltipOptions={{ immediate: true }}
                        onClick={onRemoveClicked}
                    />
                </Stack>
                {description ? (
                    <Box hoverable color={{ hover: 'cta2', default: 'gray2' }}>
                        <Text truncate fontSize="sm" fontWeight="medium">
                            {description}
                        </Text>
                    </Box>
                ) : (
                    <></>
                )}
            </Stack>
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
            insetLeft="xxs"
            width="x3"
            aspectRatio="1/1"
            style={{
                backgroundImage: `url(${url})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
            }}
        />
    )
}
