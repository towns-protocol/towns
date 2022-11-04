import { useChannelContext } from '../components/ChannelContextProvider'
import { ThreadStats } from '../types/timeline-types'
import { useTimelineThreadStats } from './use-timeline-thread-stats'

export function useChannelThreadStats(): Record<string, ThreadStats> {
    const { channelId } = useChannelContext()
    return useTimelineThreadStats(channelId)
}
