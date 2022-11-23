import React, { useCallback, useContext, useRef } from 'react'

import { useZionClient } from 'use-zion-client'
import { Stack } from '@ui'
import { useIsScrolling } from '../hooks/useIsScrolling'
import { useLazyLoad } from '../hooks/useLazyLoad'
import { usePersistScrollPosition } from '../hooks/usePersistScrollPosition'
import { useScrollDownOnNewMessage } from '../hooks/useScrollDownOnNewMessage'
import { ObsoleteMessageTimeline } from './ObsoleteMessageTimeline'
import { MessageTimelineContext } from '../MessageTimelineContext'

interface Props {
    hideThreads?: boolean
    before?: JSX.Element
    after?: JSX.Element
}

export const ObsoleteMessageTimelineScroller = (props: Props) => {
    const timelineContext = useContext(MessageTimelineContext)
    const events = timelineContext?.events ?? []
    const channelId = timelineContext?.channelId

    const { scrollback } = useZionClient()

    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    const onLoadMore = useCallback(() => {
        if (channelId) {
            scrollback(channelId)
        }
    }, [channelId, scrollback])

    const { intersectionRef } = useLazyLoad(onLoadMore, containerRef, events.length)

    usePersistScrollPosition(containerRef, contentRef)
    useScrollDownOnNewMessage(containerRef, contentRef, events)

    const { isScrolling } = useIsScrolling(containerRef.current)

    if (!timelineContext) {
        return <></>
    }

    return (
        <>
            <Stack grow scroll ref={containerRef} style={{ overflowAnchor: 'none' }}>
                <Stack grow style={{ minHeight: 'min-content' }}>
                    <Stack
                        grow
                        paddingY="md"
                        justifyContent="end"
                        ref={contentRef}
                        pointerEvents={isScrolling ? 'none' : 'auto'}
                    >
                        <div ref={intersectionRef} />
                        <ObsoleteMessageTimeline />
                        {props.after}
                    </Stack>
                    <div ref={bottomRef} />
                </Stack>
            </Stack>
        </>
    )
}
