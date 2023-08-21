import { useMemo } from 'react'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { Client as CasablancaClient } from '@river/sdk'
import { SpaceHierarchies } from 'types/zion-types'
import { SpaceChild } from 'types/zion-types'
import { makeRoomIdentifier } from '../../types/room-identifier'
export { makeRoomIdentifier, toRoomIdentifier } from '../../types/room-identifier'

export function useCasablancaSpaceHierarchies(casablancaClient?: CasablancaClient) {
    const spaces = useCasablancaSpaces(casablancaClient)
    const spaceIds = useMemo(() => spaces.map((space) => space.id), [spaces])

    return useMemo(() => {
        if (!casablancaClient) {
            return
        }

        //TODO:
        //1.Add proper support for worldReadable, guestCanJoin, numjoinedMembers
        // (not critical for Unreads bur definitely required for consistency and absence of surprises)
        //2.Consider refactoring code using reduce (if it will be more readable)
        const children: SpaceChild[] = []

        const result: SpaceHierarchies = {}
        spaceIds.forEach((spaceId) => {
            const spaceChannels = Array.from(
                casablancaClient
                    .stream(spaceId.networkId)
                    ?.view.spaceContent.spaceChannelsMetadata.keys() || [],
            )
            spaceChannels.forEach((channel) => {
                console.log(channel)
                children.push({
                    id: makeRoomIdentifier(channel),
                    name: '',
                    avatarUrl: '',
                    topic: '',
                    worldReadable: false,
                    guestCanJoin: false,
                    numjoinedMembers: 0,
                })
            })
            result[spaceId.networkId] = {
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
        })
        return result
    }, [spaceIds, casablancaClient])
}
