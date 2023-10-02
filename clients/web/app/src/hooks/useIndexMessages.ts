import debug from 'debug'
import { useDeferredValue, useMemo } from 'react'
import { useTimelineStore } from 'use-zion-client'
import { isRoomMessage } from '@components/MessageTimeline/util/getEventsByDate'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { notUndefined } from 'ui/utils/utils'

const log = debug('app:useMessageIndex')
log.enabled = true

export const useIndexMessages = () => {
    const channels = useSpaceChannels()
    const timelines = useThrottledValue(
        useDeferredValue(useTimelineStore((s) => s.timelines)),
        1000,
    )

    const messages = useMemo(() => {
        return (channels ?? [])
            .flatMap((channel) => {
                return timelines[channel.id.networkId]
                    ?.filter(isRoomMessage)
                    .filter((e) => e.content?.body)
                    .filter((e) => e.content?.msgType !== 'm.bad.encrypted')
                    .map((e) => ({
                        key: e.eventId,
                        type: 'message' as const,
                        channelId: channel.id.networkId,
                        body: e.content?.body ?? '',
                        source: e,
                    }))
            })
            .filter(notUndefined)
    }, [channels, timelines])

    return { messages }
}
