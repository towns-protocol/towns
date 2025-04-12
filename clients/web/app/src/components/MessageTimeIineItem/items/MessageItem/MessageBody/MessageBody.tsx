import React, { useCallback, useMemo } from 'react'
import { Channel } from 'use-towns-client'
import { ChannelMessageEvent, EventStatus, TimelineEvent } from '@towns-protocol/sdk'
import { RichTextPreview as PlateRichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { getMessageBody } from 'utils/ztevent_util'
import { useDevice } from 'hooks/useDevice'
import { Box, Icon, Stack, TextButton } from '@ui'
import { isTownsAppUrl } from 'utils/isTownsAppUrl'
import { MessageStatusAnnotation } from '../MessageStatusAnnotation'

type Props = {
    event: TimelineEvent
    eventContent: ChannelMessageEvent
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

    return (
        <>
            {body && (
                <PlateRichTextPreview
                    content={body}
                    statusAnnotation={statusAnnotation}
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

        if (isTownsAppUrl(link)) {
            // body is a single markdown link to the attachment
            let pattern: string

            pattern = `[${link}](${link})`
            if (body.startsWith(pattern) || body.endsWith(pattern)) {
                return body.replace(pattern, '')
            }
            pattern = `<${link}>`
            if (body.startsWith(pattern) || body.endsWith(pattern)) {
                return body.replace(pattern, '')
            }
        }

        return body
    }, [attachedLinks, body])
}
