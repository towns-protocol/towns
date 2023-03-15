import { RoomIdentifier } from '../../types/room-identifier'
import { Membership, RoomMember } from '../../types/zion-types'
import { Client as CasablancaClient } from '@towns/client'
import { useEffect, useState } from 'react'
import { SpaceProtocol } from '../../client/ZionClientTypes'
import { useCasablancaStream } from './useCasablancaStream'

export function useCasablancaStreamMember(
    roomId?: RoomIdentifier,
    userId?: string,
    casablancaClient?: CasablancaClient,
): RoomMember | undefined {
    const channelStream = useCasablancaStream(roomId?.networkId)
    const [roomMember, setRoomMember] = useState<RoomMember>()

    useEffect(() => {
        if (roomId?.protocol !== SpaceProtocol.Casablanca) {
            return
        }
        if (!casablancaClient || !userId || !roomId || !channelStream) {
            return
        }

        const updateMember = () => {
            // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
            setRoomMember({
                userId,
                name: 'TODO. Get from casablanca stream',
                rawDisplayName: '',
                membership: Membership.Join,
                disambiguate: false,
                avatarUrl: undefined,
            })
        }

        const onNewUserJoined = (streamId: string, newUserId: string) => {
            if (userId === newUserId) {
                updateMember()
            }
        }

        channelStream.on('streamNewUserJoined', onNewUserJoined)

        return () => {
            channelStream.off('streamNewUserJoined', onNewUserJoined)
        }
    }, [casablancaClient, roomId, channelStream, userId])

    return roomMember
}
