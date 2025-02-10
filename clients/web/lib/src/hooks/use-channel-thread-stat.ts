import { TimelineStoreStates, useRawTimelineStore } from '../store/use-timeline-store'
import { useChannelContext } from '../components/ChannelContextProvider'
import { ThreadStatsData } from '../types/timeline-types'

export function useChannelThreadStat(threadParetId: string): ThreadStatsData | undefined {
    const { channelId } = useChannelContext()
    return useRawTimelineStore(
        (state: TimelineStoreStates) => state.threadsStats[channelId]?.[threadParetId],
    )
}
