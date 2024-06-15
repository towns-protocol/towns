import { isEqual } from 'lodash'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { useChannelMembers, useMyUserId, useUnjoinedChannelMembers } from 'use-towns-client'

export const useChannelHeaderMembers = (channelId: string) => {
    const myUserId = useMyUserId()
    const { memberIds: memberIdsJoinedChannels } = useChannelMembers()
    const [memberIds, setMemberIds] = useState<string[]>([])

    const stableMemberIds = useRef(memberIds)
    stableMemberIds.current = memberIds

    const isUserChannelMember = useMemo(
        () => (myUserId ? memberIdsJoinedChannels.includes(myUserId) : false),
        [memberIdsJoinedChannels, myUserId],
    )

    const getUnjoinedChannelMembers = useEvent(useUnjoinedChannelMembers())

    useEffect(() => {
        const fetchChannelMemberIds = async () => {
            console.log('fetchChannelMemberIds...')
            if (isUserChannelMember) {
                setMemberIds(memberIdsJoinedChannels)
                return
            }
            const unjoinedMemberIds = await getUnjoinedChannelMembers(channelId)
            if (!isEqual(stableMemberIds.current, unjoinedMemberIds)) {
                setMemberIds(unjoinedMemberIds)
            }
        }
        fetchChannelMemberIds()
    }, [channelId, getUnjoinedChannelMembers, isUserChannelMember, memberIdsJoinedChannels])

    return memberIds
}
