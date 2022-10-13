import { useChannelContext } from '../components/ChannelContextProvider'
import { TimelineEvent } from '../types/timeline-types'
import { useTimeline } from './use-timeline'

// this code is dirty and jumbled, but it does what it needs to do, cleanup coming soon.
export function useChannelTimeline(): TimelineEvent[] {
    const { channelRoom } = useChannelContext()
    return useTimeline(channelRoom)
}
