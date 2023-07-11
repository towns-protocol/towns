import { RoomIdentifier } from '../../types/room-identifier'
import { Membership, RoomMember } from '../../types/zion-types'
import { Stream } from '@towns/sdk'
import { useEffect, useState } from 'react'
import { SpaceProtocol } from '../../client/ZionClientTypes'
import { useCasablancaStream } from './useCasablancaStream'

export function useCasablancaStreamMember(
    roomId?: RoomIdentifier,
    userId?: string,
): RoomMember | undefined {
    const channelStream = useCasablancaStream(roomId?.networkId)
    const [roomMember, setRoomMember] = useState<RoomMember>()

    useEffect(() => {
        if (roomId?.protocol !== SpaceProtocol.Casablanca) {
            return
        }
        if (!userId || !roomId || !channelStream) {
            return
        }
        const updateMember = () => {
            setRoomMember({
                userId,
                name: 'TODO. Get from casablanca stream',
                rawDisplayName: '',
                membership: getCasablancaMembership(channelStream, userId),
                disambiguate: false,
                avatarUrl: undefined,
            })
        }

        updateMember()

        const onStreamUserEvent = (streamId: string, newUserId: string) => {
            if (userId === newUserId) {
                updateMember()
            }
        }

        channelStream.on('streamNewUserJoined', onStreamUserEvent)
        channelStream.on('streamNewUserInvited', onStreamUserEvent)
        channelStream.on('streamUserLeft', onStreamUserEvent)

        return () => {
            channelStream.off('streamNewUserJoined', onStreamUserEvent)
            channelStream.off('streamNewUserInvited', onStreamUserEvent)
            channelStream.off('streamUserLeft', onStreamUserEvent)
        }
    }, [roomId, channelStream, userId])

    return roomMember
}

function getCasablancaMembership(stream: Stream, userId: string): Membership {
    if (stream.view.joinedUsers.has(userId)) {
        return Membership.Join
    } else if (stream.view.invitedUsers.has(userId)) {
        return Membership.Invite
    } else {
        return Membership.None
    }
}
