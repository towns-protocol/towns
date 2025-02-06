import { useChannelId, useMembership, useMyProfile } from 'use-towns-client'

export function useChannelMembership() {
    const id = useMyProfile()?.userId
    const channelId = useChannelId()

    return useMembership(channelId, id)
}
