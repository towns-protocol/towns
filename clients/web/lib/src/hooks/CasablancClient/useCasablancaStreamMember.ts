import { RoomIdentifier } from '../../types/room-identifier'
import { Membership } from '../../types/zion-types'
import { Stream } from '@river/sdk'
import { useEffect, useState } from 'react'
import { useCasablancaStream } from './useCasablancaStream'

export function useCasablancaStreamMembership(
    roomId?: RoomIdentifier,
    userId?: string,
): Membership | undefined {
    const channelStream = useCasablancaStream(roomId)
    const [roomMember, setRoomMember] = useState<Membership>()

    useEffect(() => {
        if (!userId || !roomId || !channelStream) {
            return
        }
        const updateMember = () => {
            setRoomMember(getCasablancaMembership(channelStream, userId))
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
    if (stream.view.getMemberships().joinedUsers.has(userId)) {
        return Membership.Join
    } else if (stream.view.getMemberships().invitedUsers.has(userId)) {
        return Membership.Invite
    } else {
        return Membership.None
    }
}
