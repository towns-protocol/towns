import React from 'react'
import { Channel, RoomMember, RoomMessageEvent, TimelineEvent } from 'use-zion-client'
import { RelationType } from 'matrix-js-sdk'
import { LINK } from '@lexical/markdown'
import { UnfurlData } from '@unfurl-worker/types'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { getMessageBody } from 'utils/ztevent_util'
import { isDev } from 'utils'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { useUnfurlContent } from '../../api/lib/unfurl'
import { UnfurledTwitterBlock } from './UnfurledTwitterBlock'
import { UnfurledGenericBlock } from './UnfurledGenericBlock'

type Props = {
    event: TimelineEvent
    eventContent: RoomMessageEvent
    members: RoomMember[]
    channels: Channel[]
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

export const MessageZionText = ({ eventContent, event, members, channels }: Props) => {
    const body = getMessageBody(event.eventId, eventContent)
    const urls = getUrls(body)

    const { data: unfurledContent } = useUnfurlContent({
        urlsArray: urls,
        enabled: Boolean(isDev && urls.length),
    })

    return (
        <>
            <RichTextPreview
                content={getMessageBody(event.eventId, eventContent)}
                edited={eventContent.content['m.relates_to']?.rel_type === RelationType.Replace}
                members={members}
                channels={channels}
            />
            {!unfurledContent
                ? null
                : unfurledContent.map((unfurlData: UnfurlData) => (
                      <ErrorBoundary key={unfurlData.url} FallbackComponent={ErrorFallback}>
                          <UnfurlBlock {...unfurlData} />
                      </ErrorBoundary>
                  ))}
        </>
    )
}
