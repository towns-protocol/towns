import { useMemo } from 'react'
import { DMChannelIdentifier, useMyUserId } from 'use-zion-client'

export const useMatchingMessages = (params: {
    dmChannels: DMChannelIdentifier[]
    selectedUserArray: string[]
}) => {
    const myUserId = useMyUserId()
    const { dmChannels, selectedUserArray } = params
    const numSelectedUsers = selectedUserArray.length

    const inclusiveMatches = useMemo(
        () =>
            dmChannels.filter((dm) => {
                switch (numSelectedUsers) {
                    case 0: // 0 users = no match
                        return false
                    case 1: // 1 user = 1:1 DM only
                        return !dm.isGroup && dm.userIds.includes(selectedUserArray[0])
                    default: // 2+ users = dm/gdm including all selected users
                        return selectedUserArray.every((id) => dm.userIds.includes(id))
                }
            }),
        [dmChannels, numSelectedUsers, selectedUserArray],
    )

    const matchingDM = useMemo(
        () => numSelectedUsers === 1 && inclusiveMatches.at(0),
        [inclusiveMatches, numSelectedUsers],
    )
    const matchingGDM = useMemo(
        () =>
            numSelectedUsers > 1
                ? inclusiveMatches.filter((c) =>
                      c.userIds.every((u) => selectedUserArray.includes(u) || u === myUserId),
                  )
                : [],
        [inclusiveMatches, myUserId, numSelectedUsers, selectedUserArray],
    )

    return {
        inclusiveMatches,
        matchingDM,
        matchingGDM,
    }
}
