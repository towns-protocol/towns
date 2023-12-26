import { TimelineStoreStates, useTimelineStore } from '../store/use-timeline-store'
import { useChannelContext } from '../components/ChannelContextProvider'
import { ThreadStats } from '../types/timeline-types'

export function useChannelThreadStat(threadParetId: string): ThreadStats | undefined {
    const { channelId } = useChannelContext()
    return useTimelineStore(
        (state: TimelineStoreStates) => state.threadsStats[channelId]?.[threadParetId],
    )
}
