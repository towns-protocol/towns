import { useChannelContext } from '../components/ChannelContextProvider'
import { MessageReactions } from '../types/timeline-types'
import { useTimelineReactions } from './use-timeline-reactions'

export function useChannelReactions(): Record<string, MessageReactions> {
    const { channelId } = useChannelContext()
    return useTimelineReactions(channelId)
}
