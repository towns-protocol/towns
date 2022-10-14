import { useChannelContext } from '../components/ChannelContextProvider'
import { TimelineEvent } from '../types/timeline-types'

export function useChannelTimeline(): TimelineEvent[] {
    const { channelTimeline } = useChannelContext()
    return channelTimeline
}
