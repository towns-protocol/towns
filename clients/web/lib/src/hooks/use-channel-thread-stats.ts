import { ThreadStatsData } from '@towns-protocol/sdk'
import { useChannelContext } from '../components/ChannelContextProvider'
import { useTimelineThreadStats } from './use-timeline-thread-stats'

export function useChannelThreadStats(): Record<string, ThreadStatsData> {
    const { channelId } = useChannelContext()
    return useTimelineThreadStats(channelId)
}
