import { useChannelContext } from '../components/ChannelContextProvider'
import { useMembers } from './use-members'

/**
 * Returns all members of the channel in the current channel context
 */
export function useChannelMembers() {
    const { channelId } = useChannelContext()
    return useMembers(channelId)
}
