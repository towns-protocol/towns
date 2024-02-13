import { Stream } from '@river/sdk'
import { Membership, RoomMember, StreamView } from '../../types/zion-types'

export function toStreamView(stream: Stream, membership: Membership): StreamView {
    const metadata = stream.view.getUserMetadata()

    const members: RoomMember[] = Array.from(stream.view.getMemberships().joinedUsers, (userId) => {
        const info = metadata?.userInfo(userId)
        return {
            userId: userId,
            membership: Membership.Join,
            username: info?.username ?? '',
            usernameConfirmed: info?.usernameConfirmed ?? false,
            usernameEncrypted: info?.usernameEncrypted ?? false,
            displayName: info?.displayName ?? '',
            displayNameEncrypted: info?.displayNameEncrypted ?? false,
            disambiguate: false,
        }
    })

    return {
        id: stream.streamId,
        membership: membership,
        members: members,
    }
}
