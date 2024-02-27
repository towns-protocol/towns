import { Stream, StreamMember } from '@river/sdk'
import { Membership, RoomMember, StreamView } from '../../types/zion-types'

export function toStreamView(stream: Stream, membership: Membership): StreamView {
    const metadata = stream.view.getUserMetadata()

    const members: RoomMember[] = Object.values(stream.view.getMembers().joined).map(
        (streamMember: StreamMember) => {
            const info = metadata?.userInfo(streamMember.userId)
            return {
                userId: streamMember.userId,
                membership: Membership.Join,
                username: info?.username ?? '',
                usernameConfirmed: info?.usernameConfirmed ?? false,
                usernameEncrypted: info?.usernameEncrypted ?? false,
                displayName: info?.displayName ?? '',
                displayNameEncrypted: info?.displayNameEncrypted ?? false,
                disambiguate: false,
            }
        },
    )

    return {
        id: stream.streamId,
        membership: membership,
        members: members,
    }
}
