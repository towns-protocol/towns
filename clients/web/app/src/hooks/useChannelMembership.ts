import { useChannelId, useMembership, useMyProfile, useRoom } from 'use-zion-client'

export function useChannelMembership() {
    const id = useMyProfile()?.userId
    const channelId = useChannelId()
    const room = useRoom(channelId)

    return useMembership(room?.id, id)
}
