import debug from 'debug'
import { useDeferredValue, useMemo } from 'react'
import { useTimelineStore } from 'use-zion-client'
import { isRoomMessage } from '@components/MessageTimeline/util/getEventsByDate'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { notUndefined } from 'ui/utils/utils'
import { useDmChannels } from './useDMChannels'

const log = debug('app:useMessageIndex')
log.enabled = true

export const useIndexMessages = () => {
    const channels = useSpaceChannels()
    const dmChannels = useDmChannels()

    const timelines = useThrottledValue(
        useDeferredValue(useTimelineStore((s) => s.timelines)),
        1000,
    )

    const messages = useMemo(() => {
        return (channels ?? [])
            .flatMap((channel) => {
                return timelines[channel.id]
                    ?.filter(isRoomMessage)
                    .filter((e) => e.content?.body)
                    .map((e) => ({
                        key: e.eventId,
                        type: 'message' as const,
                        channelId: channel.id,
                        body: e.content?.body ?? '',
                        source: e,
                    }))
            })
            .filter(notUndefined)
    }, [channels, timelines])

    const dmMessages = useMemo(() => {
        return dmChannels
            .flatMap((channel) => {
                return timelines[channel.id]
                    ?.filter(isRoomMessage)
                    .filter((e) => e.content?.body)
                    .map((e) => ({
                        key: e.eventId,
                        type: 'dmMessage' as const,
                        channelId: channel.id,
                        body: e.content?.body ?? '',
                        source: e,
                    }))
            })
            .filter(notUndefined)
    }, [dmChannels, timelines])
    return { messages, dmMessages }
}
