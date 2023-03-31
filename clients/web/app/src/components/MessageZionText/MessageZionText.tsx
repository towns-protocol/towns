import React from 'react'
import { Channel, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { LINK } from '@lexical/markdown'
import { UnfurlData } from '@unfurl-worker/types'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { getMessageBody } from 'utils/ztevent_util'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { Paragraph, Stack } from '@ui'
import { useUnfurlContent } from '../../api/lib/unfurl'
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

// matching whatever lexical decides a "url" is
function getUrls(body: string) {
    const regexp = new RegExp(LINK.importRegExp, 'g')
    return [...new Set(Array.from(body.matchAll(regexp), (m) => m[2]))]
}

export const MessageZionText = ({
    eventContent,
    event,
    members,
    channels,
    onMentionClick,
}: Props) => {
    const body = getMessageBody(event.eventId, eventContent)
    const urls = getUrls(body)

    const { data: unfurledContent, isError } = useUnfurlContent({
        urlsArray: urls,
        enabled: urls.length > 0,
    })

    const invalidContent = isError || !Array.isArray(unfurledContent)

    return (
        <>
            <RichTextPreview
                content={getMessageBody(event.eventId, eventContent)}
                edited={eventContent.replacedMsgId !== undefined}
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
