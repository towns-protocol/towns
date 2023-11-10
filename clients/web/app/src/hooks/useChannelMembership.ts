import { useChannelMembers, useMyProfile } from 'use-zion-client'

export function useChannelMembership() {
    const members = useChannelMembers()
    const id = useMyProfile()?.userId
    return members.members.find((m) => m.userId === id)?.membership
}
