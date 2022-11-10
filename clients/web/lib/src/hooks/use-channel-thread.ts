import { useChannelContext } from '../components/ChannelContextProvider'
import { useTimelineThread } from './use-timeline-thread'

export function useChannelThread(eventId: string): ReturnType<typeof useTimelineThread> {
    const { channelId } = useChannelContext()
    return useTimelineThread(channelId, eventId)
}
