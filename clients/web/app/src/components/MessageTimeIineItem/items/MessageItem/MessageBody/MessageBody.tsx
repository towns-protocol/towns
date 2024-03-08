import React, { useCallback, useMemo } from 'react'
import { Channel, EventStatus, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-towns-client'
import { UnfurlData } from '@unfurl-worker/types'
import { ErrorBoundary, FallbackProps } from '@components/ErrorBoundary/ErrorBoundary'
import { RichTextPreview } from '@components/RichText/RichTextPreview'
import { getMessageBody, getUrls } from 'utils/ztevent_util'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { MessageStatusAnnotation } from '@components/RichText/hooks/useInitialConfig'
import { useDevice } from 'hooks/useDevice'
import { Box, Icon, Stack, TextButton } from '@ui'
import { useUnfurlContent } from '../../../../../api/lib/unfurl'
import { UnfurledTwitterBlock } from './UnfurledTwitterBlock'
import { UnfurledGenericBlock } from './UnfurledGenericBlock'

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

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div role="alert">
            <p>Error unfurling content: </p>
            <pre>{error.message}</pre>
            <button onClick={resetErrorBoundary}>Try again</button>
        </div>
    )
}

const UnfurlBlock = (props: UnfurlData) => {
    const { info: twitterInfo, url, type, image } = props

    if (type === 'twitter' && twitterInfo) {
        return <UnfurledTwitterBlock url={url} {...twitterInfo} />
    }

    if (type === 'image' && image) {
        return <RatioedBackgroundImage url={url} width={image.width} height={image.height} />
    }

    return <UnfurledGenericBlock {...props} />
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
    const urls = getUrls(body)

    const { isTouch } = useDevice()

    body = useHideAttachementLinks(body, attachedLinks)

    const { data: unfurledContent, isError } = useUnfurlContent({
        urlsArray: urls,
        enabled: urls.length > 0,
    })

    const invalidContent = isError || !Array.isArray(unfurledContent)
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
                <RichTextPreview
                    content={body}
                    statusAnnotation={statusAnnotation}
                    members={members}
                    channels={channels}
                    onMentionClick={onMentionClick}
                    onMentionHover={isTouch ? undefined : onMentionHover}
                />
            )}
            {invalidContent
                ? null
                : unfurledContent.map((unfurlData: UnfurlData) => (
                      <ErrorBoundary key={unfurlData.url} FallbackComponent={ErrorFallback}>
                          <UnfurlBlock {...unfurlData} />
                      </ErrorBoundary>
                  ))}
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
        if (attachedLinks.length === 1) {
            const link = attachedLinks[0]
            return body.trim().startsWith(link) || body.trim().endsWith(link)
                ? body.replace(link, '')
                : body
        }
        return body
    }, [attachedLinks, body])
}
