import { useTownsContext } from '../components/TownsContextProvider'
import { useEffect, useState } from 'react'
import { Membership, RoomMember } from '../types/towns-types'
import { getMembersWithMembership } from './TownsContext/useCasablancaRooms'
import isEqual from 'lodash/isEqual'

export const useAllSpaceUsers = (spaceId?: string) => {
    const [users, setUsers] = useState<RoomMember[]>([])
    const { casablancaClient: client } = useTownsContext()

    useEffect(() => {
        if (!spaceId || !client) {
            return
        }
        const rollupSpaceUsers = () => {
            const stream = client.streams.get(spaceId)
            if (!stream) {
                return
            }
            const joined = getMembersWithMembership(Membership.Join, stream)
            const left = getMembersWithMembership(Membership.Leave, stream)
            const allUsers = joined.concat(left)
            setUsers((prev) => {
                if (isEqual(prev, allUsers)) {
                    return prev
                }
                return allUsers
            })
        }

        const onStreamUpdated = (streamId: string) => {
            if (streamId === spaceId) {
                rollupSpaceUsers()
            }
        }
        rollupSpaceUsers()

        client.on('streamInitialized', onStreamUpdated)
        client.on('streamMembershipUpdated', onStreamUpdated)
        client.on('streamDisplayNameUpdated', onStreamUpdated)
        client.on('streamPendingDisplayNameUpdated', onStreamUpdated)
        client.on('streamUsernameUpdated', onStreamUpdated)
        client.on('streamPendingUsernameUpdated', onStreamUpdated)
        client.on('streamNewUserJoined', onStreamUpdated)
        client.on('streamUserLeft', onStreamUpdated)
        client.on('streamEnsAddressUpdated', onStreamUpdated)
        client.on('streamNftUpdated', onStreamUpdated)
        return () => {
            client.off('streamInitialized', onStreamUpdated)
            client.off('streamMembershipUpdated', onStreamUpdated)
            client.off('streamDisplayNameUpdated', onStreamUpdated)
            client.off('streamPendingDisplayNameUpdated', onStreamUpdated)
            client.off('streamUsernameUpdated', onStreamUpdated)
            client.off('streamPendingUsernameUpdated', onStreamUpdated)
            client.off('streamNewUserJoined', onStreamUpdated)
            client.off('streamUserLeft', onStreamUpdated)
            client.off('streamEnsAddressUpdated', onStreamUpdated)
            client.off('streamNftUpdated', onStreamUpdated)
        }
    }, [client, spaceId, setUsers])

    return { users }
}
