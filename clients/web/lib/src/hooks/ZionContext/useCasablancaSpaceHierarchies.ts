import { useMemo, useRef } from 'react'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { Client as CasablancaClient } from '@river/sdk'
import { SpaceHierarchies } from 'types/zion-types'
import { SpaceChild } from 'types/zion-types'
import isEqual from 'lodash/isEqual'

export function useCasablancaSpaceHierarchies(
    casablancaClient?: CasablancaClient,
): SpaceHierarchies {
    const spaces = useCasablancaSpaces(casablancaClient)

    const previousSpaceIdsRef = useRef<string[]>([])

    const spaceIds = useMemo(() => {
        const newSpaceIds = spaces.map((space) => space.id)
        if (isEqual(previousSpaceIdsRef.current, newSpaceIds)) {
            return previousSpaceIdsRef.current
        } else {
            previousSpaceIdsRef.current = newSpaceIds
            return newSpaceIds
        }
    }, [spaces])

    const previousSpaceHierarchiesRef = useRef<SpaceHierarchies>({})

    // todo austin - seems like this should be a useEffect that listens to add/remove channel events
    return useMemo(() => {
        if (!casablancaClient) {
            return previousSpaceHierarchiesRef.current
        }

        const result: SpaceHierarchies = {}
        spaceIds.forEach((spaceId) => {
            //TODO:
            //1.Add proper support for worldReadable, guestCanJoin, numjoinedMembers
            // (not critical for Unreads bur definitely required for consistency and absence of surprises)
            //2.Consider refactoring code using reduce (if it will be more readable)
            result[spaceId] = toSpaceHierarchy(casablancaClient, spaceId)
        })
        if (isEqual(previousSpaceHierarchiesRef.current, result)) {
            return previousSpaceHierarchiesRef.current
        } else {
            previousSpaceHierarchiesRef.current = result
            return result
        }
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
