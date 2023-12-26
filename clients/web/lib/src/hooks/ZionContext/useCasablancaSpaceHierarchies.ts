import { useMemo } from 'react'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { Client as CasablancaClient } from '@river/sdk'
import { SpaceHierarchies } from 'types/zion-types'
import { SpaceChild } from 'types/zion-types'

export function useCasablancaSpaceHierarchies(
    casablancaClient?: CasablancaClient,
): SpaceHierarchies {
    const spaces = useCasablancaSpaces(casablancaClient)
    const spaceIds = useMemo(() => spaces.map((space) => space.id), [spaces])

    // todo austin - seems like this should be a useEffect that listens to add/remove channel events
    return useMemo(() => {
        if (!casablancaClient) {
            return {}
        }

        const result: SpaceHierarchies = {}
        spaceIds.forEach((spaceId) => {
            //TODO:
            //1.Add proper support for worldReadable, guestCanJoin, numjoinedMembers
            // (not critical for Unreads bur definitely required for consistency and absence of surprises)
            //2.Consider refactoring code using reduce (if it will be more readable)
            result[spaceId] = toSpaceHierarchy(casablancaClient, spaceId)
        })
        return result
    }, [spaceIds, casablancaClient])
}

export function toSpaceHierarchy(casablancaClient: CasablancaClient, spaceId: string) {
    const children: SpaceChild[] = []
    const spaceChannels = Array.from(
        casablancaClient.stream(spaceId)?.view.spaceContent.spaceChannelsMetadata.keys() || [],
    )
    spaceChannels.forEach((channel) => {
        console.log(channel)
        children.push({
            id: channel,
            name: '',
            avatarUrl: '',
            topic: '',
            worldReadable: false,
            guestCanJoin: false,
            numjoinedMembers: 0,
        })
    })
    return {
        root: {
            id: spaceId,
            name: '',
            avatarUrl: '',
            topic: '',
            worldReadable: false,
            guestCanJoin: false,
            numjoinedMembers: 0,
        } satisfies SpaceChild,
        children: children,
    }
}
