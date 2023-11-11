import { useMemo } from 'react'
import { useChannelContext } from '../components/ChannelContextProvider'
import { useMembers } from './use-members'
import { useSpaceMembers } from './use-space-members'

/**
 * Returns all members of the channel in the current channel context
 */
export function useChannelMembers() {
    const { channelId } = useChannelContext()
    const { members } = useMembers(channelId)
    const { membersMap } = useSpaceMembers()
    return useMemo(() => {
        return {
            members: members.map((u) => membersMap[u.userId] ?? u),
        }
    }, [members, membersMap])
}
