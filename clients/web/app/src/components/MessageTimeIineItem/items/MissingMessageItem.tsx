import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTownsClient } from 'use-towns-client'
import { useInView } from 'react-intersection-observer'
import { Box, Button, Stack, Text } from '@ui'
import { useTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'

const SCROLLBACK_COUNT = 5
export const MissingMessageItem = () => {
    const timelineContext = useTimelineContext()
    const { scrollbackToEvent } = useTownsClient()
    const fetchingRef = useRef(false)
    const [isFetching, setIsFetching] = useState(false)
    const performScrollbacks = useCallback(() => {
        if (fetchingRef.current || !timelineContext.threadParentId) {
            return
        }
        setIsFetching(true)
        async function _scrollback(streamId: string, threadParentId: string) {
            try {
                await scrollbackToEvent(streamId, threadParentId, SCROLLBACK_COUNT)
            } catch (e) {
                console.error('MissingMessageItem: Error performing scrollback', e)
            } finally {
                setIsFetching(false)
            }
        }
        _scrollback(timelineContext.channelId, timelineContext.threadParentId)
    }, [
        scrollbackToEvent,
        timelineContext.channelId,
        timelineContext.threadParentId,
        setIsFetching,
    ])

    fetchingRef.current = isFetching

    return (
        <Stack horizontal gap="sm" paddingX="md" alignItems="center">
            <Text size="md" color="default" fontWeight="medium">
                Message not loaded
            </Text>

            <Button size="button_xs" disabled={isFetching} onClick={performScrollbacks}>
                {isFetching ? 'Loading...' : 'Load more'}
            </Button>
            <InViewObserver onInView={performScrollbacks} />
        </Stack>
    )
}

const InViewObserver = (props: { onInView: () => void }) => {
    const { onInView } = props
    const { ref, inView } = useInView({ threshold: 0, triggerOnce: true })

    useEffect(() => {
        if (inView) {
            onInView()
        }
    }, [inView, onInView])
    return <Box position="relative" ref={ref} />
}
