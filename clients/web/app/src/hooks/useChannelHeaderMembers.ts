import { useEffect, useMemo, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { useChannelMembers, useMyUserId, useUnjoinedChannelMembers } from 'use-towns-client'

export const useChannelHeaderMembers = (channelId: string) => {
    const myUserId = useMyUserId()
    const { memberIds: memberIdsJoinedChannels } = useChannelMembers()
    const [memberIds, setMemberIds] = useState<string[]>([])

    const isUserChannelMember = useMemo(
        () => (myUserId ? memberIdsJoinedChannels.includes(myUserId) : false),
        [memberIdsJoinedChannels, myUserId],
    )

    const getUnjoinedChannelMembers = useEvent(useUnjoinedChannelMembers())

    useEffect(() => {
        const fetchChannelMemberIds = async () => {
            if (isUserChannelMember) {
                setMemberIds(memberIdsJoinedChannels)
                return
            }
            const unjoinedMemberIds = await getUnjoinedChannelMembers(channelId)
            setMemberIds(unjoinedMemberIds)
        }
        fetchChannelMemberIds()
    }, [channelId, getUnjoinedChannelMembers, isUserChannelMember, memberIdsJoinedChannels])

    return memberIds
}
