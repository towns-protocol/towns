import { useChannelContext } from '../components/ChannelContextProvider'
import { ThreadStatsData } from '../types/timeline-types'
import { useTimelineThreadStats } from './use-timeline-thread-stats'

export function useChannelThreadStats(): Record<string, ThreadStatsData> {
    const { channelId } = useChannelContext()
    return useTimelineThreadStats(channelId)
}
