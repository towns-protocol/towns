import { useMemo } from 'react'
import { useCasablancaSpaces } from '../CasablancClient/useCasablancaSpaces'
import { Client as CasablancaClient } from '@towns/sdk'
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

        console.log('MEOW spaceIds: ', JSON.stringify(spaceIds))
        const children: SpaceChild[] = []

        const result: SpaceHierarchies = {}
        spaceIds.forEach((spaceId) => {
            casablancaClient.stream(spaceId.networkId)?.rollup.spaceChannels.forEach((channel) => {
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
        console.log('MEOW person: ', JSON.stringify(result))
        return result
    }, [casablancaClient, spaceIds])
}
