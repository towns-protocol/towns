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
                if (numSelectedUsers > 1) {
                    return selectedUserArray.every((id) => dm.userIds.includes(id))
                }
            }),
        [dmChannels, numSelectedUsers, selectedUserArray],
    )

    const matchingDM = useMemo(
        () =>
            numSelectedUsers === 1 &&
            dmChannels.find((c) => !c.isGroup && c.userIds.includes(selectedUserArray[0])),
        [dmChannels, numSelectedUsers, selectedUserArray],
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
