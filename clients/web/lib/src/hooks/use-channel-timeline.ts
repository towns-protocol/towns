import { useChannelContext } from '../components/ChannelContextProvider'
import { TimelineEvent } from '../types/timeline-types'
import { useTimeline } from './use-timeline'

export function useChannelTimeline(): TimelineEvent[] {
    const { channelId } = useChannelContext()
    return useTimeline(channelId)
}
