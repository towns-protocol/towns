import { Membership } from '../../types/towns-types'
import { Stream } from '@river/sdk'
import { useEffect, useState } from 'react'
import { useCasablancaStream } from './useCasablancaStream'

export function useCasablancaStreamMembership(
    roomId?: string,
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

        const onStreamInitialized = (streamId: string) => {
            if (streamId === roomId) {
                updateMember()
            }
        }

        channelStream.on('streamNewUserJoined', onStreamUserEvent)
        channelStream.on('streamNewUserInvited', onStreamUserEvent)
        channelStream.on('streamUserLeft', onStreamUserEvent)
        channelStream.on('streamInitialized', onStreamInitialized)

        return () => {
            channelStream.off('streamNewUserJoined', onStreamUserEvent)
            channelStream.off('streamNewUserInvited', onStreamUserEvent)
            channelStream.off('streamUserLeft', onStreamUserEvent)
            channelStream.off('streamInitialized', onStreamInitialized)
        }
    }, [roomId, channelStream, userId])

    return roomMember
}

function getCasablancaMembership(stream: Stream, userId: string): Membership {
    if (stream.view.getMembers().membership.joinedUsers.has(userId)) {
        return Membership.Join
    } else if (stream.view.getMembers().membership.invitedUsers.has(userId)) {
        return Membership.Invite
    } else {
        return Membership.None
    }
}
