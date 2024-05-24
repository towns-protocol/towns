import React, { useCallback, useMemo } from 'react'
import { Channel, EventStatus, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-towns-client'
import { RichTextPreview as PlateRichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { RichTextPreview } from '@components/RichText/RichTextPreview'
import { getMessageBody } from 'utils/ztevent_util'
import { MessageStatusAnnotation } from '@components/RichText/hooks/useInitialConfig'
import { useDevice } from 'hooks/useDevice'
import { Box, Icon, Stack, TextButton } from '@ui'
import { env } from 'utils'

type Props = {
    event: TimelineEvent
    eventContent: RoomMessageEvent
    members: RoomMember[]
    attachedLinks: string[]
    channels: Channel[]
    onMentionClick?: (mentionName: string) => void
    onMentionHover?: (element?: HTMLElement, userId?: string) => void
    onRetrySend?: () => void
}

export const MessageBody = ({
    attachedLinks,
    eventContent,
    event,
    members,
    channels,
    onMentionClick,
    onMentionHover,
    onRetrySend,
}: Props) => {
    let body = getMessageBody(event.eventId, eventContent)
    const { isTouch } = useDevice()

    body = useHideAttachementLinks(body, attachedLinks)

    const onRetryButtonClicked = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            onRetrySend?.()
        },
        [onRetrySend],
    )

    let statusAnnotation: MessageStatusAnnotation | undefined = undefined
    if (eventContent.editsEventId !== undefined) {
        statusAnnotation = 'edited' as const
    } else if (event.status === EventStatus.NOT_SENT) {
        statusAnnotation = 'not-sent' as const
    }

    const MessagePreview = env.VITE_ENABLE_SLATE_PREVIEW ? PlateRichTextPreview : RichTextPreview
    return (
        <>
            {body && (
                <MessagePreview
                    content={body}
                    statusAnnotation={statusAnnotation}
                    users={members}
                    mentions={eventContent.mentions}
                    channels={channels}
                    onMentionClick={onMentionClick}
                    onMentionHover={isTouch ? undefined : onMentionHover}
                />
            )}

            {statusAnnotation === 'not-sent' && (
                <Stack horizontal>
                    <Stack
                        horizontal
                        alignItems="center"
                        insetTop="xs"
                        insetLeft="xxs"
                        tooltip="This message failed to send. Try again."
                    >
                        <Icon type="arrowCircle" paddingBottom="xxs" />
                        <TextButton color="default" onClick={onRetryButtonClicked}>
                            Retry
                        </TextButton>
                    </Stack>
                    <Box grow />
                </Stack>
            )}
        </>
    )
}

/**
 * hide links to attachments if they are not interwined with the message body
 */
const useHideAttachementLinks = (body: string, attachedLinks: string[]) => {
    return useMemo(() => {
        if (!attachedLinks?.length) {
            return body
        }
        const link = attachedLinks?.[0]
        if (link?.match(/^https:\/\/[a-z.]+\.towns\.com\//i)) {
            // body is a single markdown link to the attachment
            const pattern = `[${link}](${link})`
            return body.startsWith(pattern) || body.endsWith(pattern)
                ? body.replace(pattern, '')
                : body
        }
        return body
    }, [attachedLinks, body])
}
