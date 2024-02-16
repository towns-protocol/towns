import { useMemo, useRef } from 'react'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { Client as CasablancaClient } from '@river/sdk'
import { SpaceChild, SpaceHierarchies } from 'types/zion-types'
import isEqual from 'lodash/isEqual'

export function useCasablancaSpaceHierarchies(
    casablancaClient?: CasablancaClient,
): SpaceHierarchies {
    const spaces = useCasablancaSpaces(casablancaClient)
    const previousSpaceHierarchiesRef = useRef<SpaceHierarchies>({})

    // todo austin - seems like this should be a useEffect that listens to
    // add/remove channel events

    return useMemo(() => {
        if (!casablancaClient) {
            return {}
        }
        const rootHierarchy = spaces.reduce((rootHierarchy, space) => {
            const spaceId = space.id
            const spaceHierarchy = toSpaceHierarchy(casablancaClient, spaceId)
            const prevChannels = previousSpaceHierarchiesRef.current[spaceId]
            return {
                ...rootHierarchy,
                [spaceId]: isEqual(prevChannels, spaceHierarchy) ? prevChannels : spaceHierarchy,
            }
        }, {})

        if (isEqual(previousSpaceHierarchiesRef.current, rootHierarchy)) {
            return previousSpaceHierarchiesRef.current
        } else {
            previousSpaceHierarchiesRef.current = rootHierarchy
            return rootHierarchy
        }
    }, [casablancaClient, spaces])
}

export function toSpaceHierarchy(casablancaClient: CasablancaClient, spaceId: string) {
    const spaceChannels = Array.from(
        casablancaClient.stream(spaceId)?.view.spaceContent.spaceChannelsMetadata.keys() || [],
    )
    const children: SpaceChild[] = []
    spaceChannels.forEach((channel) => {
        children.push({
            id: channel,
            name: '',
            avatarUrl: '',
            topic: '',
            worldReadable: false,
            guestCanJoin: false,
            numjoinedMembers: 0,
        } satisfies SpaceChild)
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
