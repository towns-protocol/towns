import { useChannelId, useMembership, useMyProfile, useRoom } from 'use-towns-client'

export function useChannelMembership() {
    const id = useMyProfile()?.userId
    const channelId = useChannelId()
    const room = useRoom(channelId)

    return useMembership(room?.id, id)
}
