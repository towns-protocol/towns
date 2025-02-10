import debug from 'debug'
import { useThrottledTimelineStore } from 'use-towns-client'
import { useDeferredValue, useMemo } from 'react'
import { isChannelMessage } from '@components/MessageTimeline/util/getEventsByDate'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { notUndefined } from 'ui/utils/utils'
import { DMMessageEventDocument, MessageEventDocument } from '@components/SearchBar/types'
import { useDmChannels } from './useDMChannels'

const log = debug('app:useMessageIndex')
log.enabled = true

export const useIndexMessages = () => {
    const channels = useSpaceChannels()
    const dmChannels = useDmChannels()

    const timelines = useDeferredValue(useThrottledTimelineStore((s) => s.timelines))

    const messages = useMemo<MessageEventDocument[]>(() => {
        return (channels ?? [])
            .flatMap((channel) => {
                return timelines[channel.id]
                    ?.filter(isChannelMessage)
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

    const dmMessages = useMemo<DMMessageEventDocument[]>(() => {
        return dmChannels
            .flatMap((channel) => {
                return timelines[channel.id]
                    ?.filter(isChannelMessage)
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
