import { useChannelContext } from '../components/ChannelContextProvider'
import { useTimeline } from './use-timeline'

export function useChannelTimeline() {
    const { channelId } = useChannelContext()
    return useTimeline(channelId)
}
