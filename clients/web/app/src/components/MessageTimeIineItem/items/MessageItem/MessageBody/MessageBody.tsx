import React from 'react'
import { Channel, EventStatus, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { UnfurlData } from '@unfurl-worker/types'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { getMessageBody, getUrls } from 'utils/ztevent_util'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { Paragraph, Stack } from '@ui'
import { MessageStatusAnnotation } from '@components/RichText/hooks/useInitialConfig'
import { useUnfurlContent } from '../../../../../api/lib/unfurl'
import { UnfurledTwitterBlock } from './UnfurledTwitterBlock'
import { UnfurledGenericBlock } from './UnfurledGenericBlock'

type Props = {
    event: TimelineEvent
    eventContent: RoomMessageEvent
    members: RoomMember[]
    channels: Channel[]
    onMentionClick?: (mentionName: string) => void
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

export const MessageBody = ({ eventContent, event, members, channels, onMentionClick }: Props) => {
    const body = getMessageBody(event.eventId, eventContent)
    const urls = getUrls(body)

    const { data: unfurledContent, isError } = useUnfurlContent({
        urlsArray: urls,
        enabled: urls.length > 0,
    })

    const invalidContent = isError || !Array.isArray(unfurledContent)

    let statusAnnotation: MessageStatusAnnotation | undefined = undefined
    if (eventContent.replacedMsgId !== undefined) {
        statusAnnotation = 'edited' as const
    } else if (event.status === EventStatus.NOT_SENT) {
        statusAnnotation = 'not-sent' as const
    }

    return (
        <>
            <RichTextPreview
                content={getMessageBody(event.eventId, eventContent)}
                statusAnnotation={statusAnnotation}
                members={members}
                channels={channels}
                onMentionClick={onMentionClick}
            />

            {invalidContent
                ? null
                : unfurledContent.map((unfurlData: UnfurlData) => (
                      <ErrorBoundary key={unfurlData.url} FallbackComponent={ErrorFallback}>
                          <UnfurlBlock {...unfurlData} />
                      </ErrorBoundary>
                  ))}
            {eventContent.msgType === 'm.bad.encrypted' ? (
                <Stack cellSpacing="md">
                    <Paragraph>Reaching out to online users for keys...</Paragraph>
                </Stack>
            ) : null}
        </>
    )
}
